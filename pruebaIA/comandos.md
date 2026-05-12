# Preparacion

```python
python -m pip install --upgrade pip

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

pip install transformers accelerate huggingface_hub

pip install huggingface_hub[cli]
```

# Descargar Qwen

```python
hf download Qwen/Qwen3-8B --local-dir Qwen3-8B
```
# Crear archivos de prueba

```python
mkdir qwen_project
cd qwen_project

ni qwen_client.py
ni main.py
```

# qwen_client.py

```python

import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM


class QwenClient:
    def __init__(self, model_path="Qwen3-8B"):
        print("Cargando tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=True
        )

        print("Cargando modelo...")
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype="auto",
            device_map="auto",
            trust_remote_code=True
        )

        print("Modelo cargado correctamente.")

    def chat(self, messages, max_new_tokens=512):
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False
        )

        inputs = self.tokenizer(
            [text],
            return_tensors="pt"
        ).to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )

        generated_ids = outputs[0][inputs.input_ids.shape[-1]:]

        response = self.tokenizer.decode(
            generated_ids,
            skip_special_tokens=True
        )

        return response.strip()

    def ask(self, prompt):
        return self.chat([
            {"role": "user", "content": prompt}
        ])

    def create_json_element(self, element_type, description):
        system_prompt = """
Eres un asistente que crea objetos JSON para una app de DnD.

Reglas:
- Si faltan datos, pregunta.
- Si tienes suficiente info, devuelve SOLO JSON válido.
- No pongas texto fuera del JSON.

Formato weapon:
{
  "type": "weapon",
  "name": "",
  "category": "",
  "rarity": "",
  "damage": {
    "dice": "",
    "type": ""
  },
  "properties": [],
  "description": []
}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"""
Tipo: {element_type}

Descripción:
{description}
"""
            }
        ]

        return self.chat(messages)

    def create_json_as_dict(self, element_type, description):
        response = self.create_json_element(element_type, description)

        try:
            return json.loads(response)
        except:
            return {
                "error": "No es JSON válido",
                "raw": response
            }

```

# main.py

```python
from qwen_client import QwenClient


def main():
    qwen = QwenClient()

    print("\n--- TEST 1 ---")
    print(qwen.ask("Hola, responde en español."))

    print("\n--- TEST 2 ---")
    print(qwen.create_json_element(
        "weapon",
        "Espada larga de fuego que hace daño cortante y fuego"
    ))

    print("\n--- TEST 3 (DICT) ---")
    print(qwen.create_json_as_dict(
        "weapon",
        "Daga mágica rara que hace 1d4 perforante y 1d6 necrótico"
    ))


if __name__ == "__main__":
    main()
```

# Ejecutar el proyecto

```python
python main.py
```