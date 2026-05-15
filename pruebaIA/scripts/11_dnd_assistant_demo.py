"""
11_dnd_assistant_demo.py — Demo completa: LoRA + RAG + API Services.

Junta todo el ecosistema:
  1. Modelo base Qwen3-8B + adaptador LoRA entrenado
  2. RAG (búsqueda en PDFs vía ChromaDB — script 09)
  3. API Services (consulta a la API real de la app Angular — script 10)

El contexto de datos se obtiene desde ApiSearch (scripts/10_mongo_search.py),
que llama a los mismos endpoints que los services de Angular (items, monsters, spells).

Uso:
  python scripts/11_dnd_assistant_demo.py

Requisitos:
  - GPU con CUDA (o CPU, pero lento)
  - Modelo base en models/Qwen3-8B/
  - LoRA entrenado en models/qwen3-dnd-lora/
  - ChromaDB con PDFs indexados (ejecutá 08_rag_ingest_pdf.py)
  - API de la app corriendo en http://localhost:8000
"""

import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from scripts.rag_search import RagSearch
from scripts.mongo_search import ApiSearch  # <-- usa la API, no MongoDB directo

# ============================================================
# CONFIGURACIÓN
# ============================================================
BASE_MODEL_PATH = "models/Qwen3-8B"
LORA_PATH = "models/qwen3-dnd-lora"


# ============================================================
# 1. ASISTENTE DND COMPLETO (LoRA + RAG + API)
# ============================================================

class DndAssistant:
    """
    Asistente que combina:
      - Modelo Qwen3-8B + LoRA entrenado (comportamiento conversacional)
      - RAG ChromaDB (contexto documental de PDFs)
      - API Services (datos estructurados reales desde la API REST)

    Uso:
        assistant = DndAssistant()
        respuesta = assistant.questionnaire_step(
            element_type="weapon",
            user_message="Quiero crear una espada de fuego",
            history=[]
        )
    """

    def __init__(self):
        print("=" * 50)
        print("INICIALIZANDO ASISTENTE DND")
        print("=" * 50)

        # 1. Cargar modelo + LoRA
        print("\n[1/3] Cargando modelo base...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            BASE_MODEL_PATH,
            trust_remote_code=True,
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_PATH,
            torch_dtype="auto",
            device_map="auto",
            trust_remote_code=True,
        )

        if LORA_PATH:
            print("[1/3] Cargando adaptador LoRA...")
            self.model = PeftModel.from_pretrained(self.model, LORA_PATH)
            self.model.eval()

        # 2. RAG (búsqueda en PDFs)
        print("\n[2/3] Inicializando RAG...")
        self.rag = RagSearch()

        # 3. API Services (llama a la API REST de la app)
        print("\n[3/3] Inicializando API Services...")
        self.api = ApiSearch()

        print("\n✅ Asistente listo.")

    def generate(self, messages: list[dict], max_new_tokens: int = 700) -> str:
        """
        Genera una respuesta usando el modelo + LoRA.

        Args:
            messages: Lista de mensajes [{role, content}, ...]
            max_new_tokens: Máximo de tokens a generar

        Returns:
            Texto generado por el modelo
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

    def build_context(self, element_type: str, user_message: str) -> tuple[str, str]:
        """
        Construye el contexto combinado: RAG + API para inyectar en el prompt.

        Args:
            element_type: Tipo de elemento (weapon, armor, monster, etc.)
            user_message: Mensaje del usuario

        Returns:
            (rag_context, api_context) tupla con textos de contexto
        """
        # 1. Contexto de PDFs vía RAG
        rag_query = f"Reglas y datos sobre {element_type}: {user_message}"
        rag_context = self.rag.search_as_text(rag_query, n_results=3)

        # 2. Contexto de la API REST (datos estructurados reales)
        api_context = self.api.build_context(user_message, element_type)

        return rag_context, api_context

    def questionnaire_step(
        self,
        element_type: str,
        user_message: str,
        history: list[dict] | None = None,
    ) -> str:
        """
        Ejecuta un paso del cuestionario.

        El modelo puede responder de dos formas:
          1. Haciendo una pregunta (si faltan datos)
          2. Devolviendo JSON válido (si ya tiene todo)

        Args:
            element_type: Tipo de elemento (weapon, armor, etc.)
            user_message: Mensaje del usuario en este paso
            history: Historial de la conversación (opcional)

        Returns:
            Respuesta del modelo (pregunta o JSON)
        """
        if history is None:
            history = []

        rag_context, api_context = self.build_context(element_type, user_message)

        # Prompt del sistema con contexto
        system_prompt = f"""Eres un asistente experto en crear elementos JSON para una app de DnD.

REGLAS DE COMPORTAMIENTO:
1. Haz UNA pregunta por vez si faltan datos.
2. No generes JSON final si faltan campos obligatorios.
3. Cuando tengas datos suficientes, responde SOLO con JSON válido.
4. No escribas explicación fuera del JSON final.
5. Usa el contexto de la API para datos exactos ya existentes en la BD.
6. Usa RAG para reglas y contexto documental.
7. Si RAG o la API no contienen algo importante, preguntale al usuario.
8. No inventes reglas importantes.

TIPO DE ELEMENTO ACTUAL:
{element_type}

CONTEXTO OBTENIDO DEL PDF / RAG:
{rag_context}

DATOS OBTENIDOS DESDE LA API DE LA APP:
{api_context}

ESQUEMA BASE PARA WEAPON:
{{
  "type": "weapon",
  "name": "",
  "category": "",
  "rarity": "",
  "damage": {{
    "dice": "",
    "type": ""
  }},
  "extra_damage": {{
    "dice": "",
    "type": ""
  }},
  "properties": [],
  "weight": null,
  "cost": {{
    "quantity": null,
    "unit": ""
  }},
  "description": []
}}

CRITERIO:
- Si falta nombre, rareza, daño, tipo de daño o propiedades, pregunta.
- Si ya está todo, devuelve SOLO JSON válido.
"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        return self.generate(messages)

    def try_parse_json(self, text: str) -> dict | None:
        """Intenta parsear la respuesta como JSON. Si falla, devuelve None."""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None


# ============================================================
# 2. DEMO INTERACTIVA
# ============================================================

def demo_conversacion():
    """Simula una conversación completa de creación de item usando la API real."""
    print("\n" + "=" * 50)
    print("DEMO: CREACIÓN DE ARMA CON API REAL")
    print("=" * 50)

    assistant = DndAssistant()
    history = []

    # Paso 1: usuario pide crear un arma
    user_1 = "Quiero crear una espada larga de fuego llamada Colmillo Solar"
    print(f"\n👤 Usuario: {user_1}")

    response_1 = assistant.questionnaire_step(
        element_type="weapon",
        user_message=user_1,
        history=history,
    )
    print(f"🤖 Asistente: {response_1}")

    history.append({"role": "user", "content": user_1})
    history.append({"role": "assistant", "content": response_1})

    # Paso 2: usuario completa datos faltantes
    user_2 = "Es rara, hace 1d8 cortante y 1d6 fuego, tiene la propiedad versátil."
    print(f"\n👤 Usuario: {user_2}")

    response_2 = assistant.questionnaire_step(
        element_type="weapon",
        user_message=user_2,
        history=history,
    )
    print(f"🤖 Asistente: {response_2}")

    # Ver si es JSON
    parsed = assistant.try_parse_json(response_2)

    if parsed:
        print("\n✅ JSON VÁLIDO:")
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    else:
        print("\n⚠️  No es JSON — el modelo sigue preguntando.")
        print("   (Es correcto si faltan datos obligatorios)")
        print("   Continuá la conversación para completar datos.")

        history.append({"role": "user", "content": user_2})
        history.append({"role": "assistant", "content": response_2})

        user_3 = "Categoría: cuerpo a cuerpo marcial. Peso: 3 lb."
        print(f"\n👤 Usuario: {user_3}")

        response_3 = assistant.questionnaire_step(
            element_type="weapon",
            user_message=user_3,
            history=history,
        )
        print(f"🤖 Asistente: {response_3}")

        parsed = assistant.try_parse_json(response_3)
        if parsed:
            print("\n✅ JSON VÁLIDO:")
            print(json.dumps(parsed, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    print("""
   ╔══════════════════════════════════════════════╗
   ║  DND ASSISTANT DEMO — LoRA + RAG + API      ║
   ║                                              ║
   ║  Requisitos para funcionar:                  ║
   ║  • models/Qwen3-8B/ (descargar el modelo)    ║
   ║  • models/qwen3-dnd-lora/ (entrenar LoRA)    ║
   ║  • chroma_db/ (ejecutar 08_rag_ingest_pdf)   ║
   ║  • API en http://localhost:8000 (backend)    ║
   ╚══════════════════════════════════════════════╝
    """)

    demo_conversacion()
