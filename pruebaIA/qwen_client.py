"""
qwen_client.py — Cliente completo Qwen + LoRA + RAG + API.

Este es el archivo principal para usar la IA desde la app Angular.
Importá QwenClient donde necesites generar JSON de DnD.

Rutas de los modelos (relativas a pruebaIA/):
  - models/Qwen3-8B/         → modelo base (descargado por vos)
  - models/qwen3-dnd-lora/   → adaptador LoRA (entrenado con 04_train_lora.py)

La clase ApiSearch (scripts.mongo_search) llama a la API REST
en http://localhost:8000 — misma URL que usa la app Angular.

Ejemplo de uso:
    from qwen_client import QwenClient

    client = QwenClient()
    respuesta = client.questionnaire_step(
        element_type="weapon",
        user_message="Quiero crear una espada de fuego",
    )
"""

import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from pathlib import Path

# ============================================================
# CONFIGURACIÓN DE RUTAS — MODELOS DESCARGADOS EN models/
# ============================================================
BASE_MODEL_PATH = str(Path(__file__).parent / "models" / "Qwen3-8B")
LORA_PATH = str(Path(__file__).parent / "models" / "qwen3-dnd-lora")


class QwenClient:
    """
    Cliente para Qwen3-8B con LoRA + RAG + API.

    Métodos principales:
      - chat(messages): enviar mensajes directamente al modelo
      - questionnaire_step(element_type, user_message, history): paso de cuestionario
      - try_parse_json(text): intentar parsear respuesta como JSON
    """

    def __init__(self, base_model_path: str | None = None, lora_path: str | None = None):
        """
        Inicializa el cliente. Carga modelo base, LoRA (si existe), RAG y API.

        Args:
            base_model_path: Ruta al modelo base (default: models/Qwen3-8B)
            lora_path: Ruta al adaptador LoRA (default: models/qwen3-dnd-lora)
                       Si la carpeta no existe, carga solo el modelo base.
        """
        base_model_path = base_model_path or BASE_MODEL_PATH
        lora_path = lora_path or LORA_PATH

        print("=" * 50)
        print("QWEN CLIENT — Inicializando...")
        print("=" * 50)

        # 1. Cargar tokenizer y modelo base
        print(f"\n📦 Modelo base: {base_model_path}")
        print("Cargando tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            base_model_path,
            trust_remote_code=True,
        )

        print("Cargando modelo base...")
        self.model = AutoModelForCausalLM.from_pretrained(
            base_model_path,
            torch_dtype="auto",
            device_map="auto",
            trust_remote_code=True,
        )

        # 2. Cargar LoRA si existe
        if Path(lora_path).exists():
            print(f"🎯 Adaptador LoRA: {lora_path}")
            self.model = PeftModel.from_pretrained(self.model, lora_path)
            self.model.eval()
        else:
            print("   (sin LoRA — se usa solo el modelo base)")

        # 3. RAG y API se cargan bajo demanda (lazy)
        self._rag = None
        self._api = None

        print("\n✅ QwenClient listo.")

    # ---------------------------------------------------------------
    # RAG y API (lazy loading)
    # ---------------------------------------------------------------

    @property
    def rag(self):
        if self._rag is None:
            from scripts.rag_search import RagSearch
            print("🔍 Inicializando RAG...")
            self._rag = RagSearch()
        return self._rag

    @property
    def api(self):
        if self._api is None:
            from scripts.mongo_search import ApiSearch
            print("🌐 Inicializando API Services...")
            self._api = ApiSearch()
        return self._api

    # ---------------------------------------------------------------
    # CHAT
    # ---------------------------------------------------------------

    def chat(self, messages: list[dict], max_new_tokens: int = 512) -> str:
        """
        Envía mensajes al modelo y devuelve la respuesta generada.

        Args:
            messages: Lista de dicts con role y content
                      Ej: [{"role": "user", "content": "Hola"}]
            max_new_tokens: Máximo de tokens a generar

        Returns:
            Texto generado
        """
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )

        inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.3,
                top_p=0.9,
                do_sample=True,
            )

        response_ids = outputs[0][inputs.input_ids.shape[-1]:]
        response = self.tokenizer.decode(response_ids, skip_special_tokens=True)

        return response.strip()

    def ask(self, prompt: str) -> str:
        """Método simple: prompt de usuario → respuesta."""
        return self.chat([{"role": "user", "content": prompt}])

    # ---------------------------------------------------------------
    # CUESTIONARIO PASO A PASO
    # ---------------------------------------------------------------

    def questionnaire_step(
        self,
        element_type: str,
        user_message: str,
        history: list[dict] | None = None,
        use_rag: bool = True,
        use_api: bool = True,
    ) -> str:
        """
        Ejecuta un paso del cuestionario con contexto de RAG y API.

        Args:
            element_type: Tipo (weapon, armor, monster, spell, etc.)
            user_message: Mensaje del usuario
            history: Historial de la conversación
            use_rag: Incluir contexto de PDFs (default: True)
            use_api: Incluir datos de la API (default: True)

        Returns:
            Respuesta del modelo (pregunta o JSON)
        """
        if history is None:
            history = []

        # Construir contexto
        rag_context = ""
        api_context = ""

        if use_rag:
            rag_query = f"Reglas y datos sobre {element_type}: {user_message}"
            rag_context = self.rag.search_as_text(rag_query, n_results=3)

        if use_api:
            api_context = self.api.build_context(user_message, element_type)

        # Prompt del sistema
        system_prompt = f"""Eres un asistente experto en crear elementos JSON para una app de DnD.

REGLAS:
1. Haz UNA pregunta por vez si faltan datos.
2. No generes JSON final si faltan campos obligatorios.
3. Cuando tengas datos suficientes, responde SOLO con JSON válido.
4. No escribas explicación fuera del JSON final.
5. Usa el contexto de la API para datos exactos ya existentes.
6. Usa RAG para reglas y contexto documental.
7. Si no hay contexto suficiente, preguntale al usuario.
8. No inventes reglas importantes.

TIPO: {element_type}

CONTEXTO RAG:
{rag_context}

DATOS API:
{api_context}

ESQUEMA WEAPON:
{{
  "type": "weapon",
  "name": "",
  "category": "",
  "rarity": "",
  "damage": {{"dice": "", "type": ""}},
  "extra_damage": {{"dice": "", "type": ""}},
  "properties": [],
  "weight": null,
  "cost": {{"quantity": null, "unit": ""}},
  "description": []
}}

CRITERIO:
- Si falta nombre, rareza, daño o propiedades → pregunta.
- Si ya está todo → solo JSON.
"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        return self.chat(messages, max_new_tokens=700)

    # ---------------------------------------------------------------
    # PARSEO DE JSON
    # ---------------------------------------------------------------

    def try_parse_json(self, text: str) -> dict | None:
        """Intenta parsear la respuesta como JSON."""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None

    def create_json_element(self, element_type: str, description: str) -> str:
        """Método legacy: crea un elemento JSON a partir de descripción."""
        return self.questionnaire_step(element_type, description)

    def create_json_as_dict(self, element_type: str, description: str) -> dict:
        """Método legacy: crea elemento y lo devuelve como dict."""
        response = self.create_json_element(element_type, description)
        parsed = self.try_parse_json(response)

        if parsed:
            return parsed

        return {
            "error": "No es JSON válido",
            "raw_response": response,
        }

    # ---------------------------------------------------------------
    # UTILIDADES
    # ---------------------------------------------------------------

    def validate_json(self, data: dict) -> tuple:
        """
        Valida un JSON contra el esquema Pydantic según su tipo.

        Args:
            data: Diccionario con el JSON a validar

        Returns:
            (True, objeto) o (False, lista_de_errores)
        """
        from scripts.validate_generated_json import validate_by_type
        return validate_by_type(data)
