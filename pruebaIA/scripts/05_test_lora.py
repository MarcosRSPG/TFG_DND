"""
05_test_lora.py — Prueba el LoRA entrenado con una conversación de ejemplo.

Carga el modelo base + adaptador LoRA y prueba que el asistente
pregunte antes de generar JSON (comportamiento aprendido).

Uso:
  python scripts/05_test_lora.py
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# ============================================================
# CONFIGURACIÓN
# ============================================================
BASE_MODEL_PATH = "models/Qwen3-8B"
LORA_PATH = "models/qwen3-dnd-lora"


def main():
    print("=" * 50)
    print("TEST LORA — Qwen3 + Adaptador DnD")
    print("=" * 50)

    # 1. Cargar tokenizer
    print("\nCargando tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_PATH, trust_remote_code=True)

    # 2. Cargar modelo base
    print("Cargando modelo base...")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_PATH,
        torch_dtype="auto",
        device_map="auto",
        trust_remote_code=True,
    )

    # 3. Aplicar LoRA
    print("Aplicando adaptador LoRA...")
    model = PeftModel.from_pretrained(model, LORA_PATH)
    model.eval()

    # 4. Probar conversación
    messages = [
        {
            "role": "system",
            "content": (
                "Eres un asistente experto en crear elementos JSON para una app de DnD. "
                "Debes hacer preguntas paso a paso hasta tener todos los datos necesarios. "
                "No generes JSON final hasta tener suficiente información."
            ),
        },
        {
            "role": "user",
            "content": "Quiero crear una espada de hielo.",
        },
    ]

    print("\n" + "-" * 50)
    print("CONVERSACIÓN DE PRUEBA")
    print("-" * 50)
    print(f"Usuario: {messages[-1]['content']}")

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,
    )

    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=400,
            temperature=0.3,
            top_p=0.9,
            do_sample=True,
        )

    response_ids = outputs[0][inputs.input_ids.shape[-1]:]
    response = tokenizer.decode(response_ids, skip_special_tokens=True)

    print(f"Asistente: {response.strip()}")

    # 5. Probar con datos completos (debería generar JSON)
    print("\n" + "-" * 50)
    print("SEGUNDA INTERACCIÓN — datos completos → debe generar JSON")
    print("-" * 50)

    messages.append({"role": "assistant", "content": response.strip()})
    messages.append({
        "role": "user",
        "content": (
            "Nombre: Estalactita Helada. "
            "Tipo: espada larga. "
            "Rareza: rara. "
            "Daño: 1d8 cortante. "
            "Daño adicional: 1d6 frío. "
            "Propiedad: versátil. "
            "Descripción: una espada de hielo eterno."
        ),
    })

    print(f"Usuario: {messages[-1]['content']}")

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,
    )

    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=400,
            temperature=0.3,
            top_p=0.9,
            do_sample=True,
        )

    response_ids = outputs[0][inputs.input_ids.shape[-1]:]
    response = tokenizer.decode(response_ids, skip_special_tokens=True)

    print(f"Asistente: {response.strip()}")

    # Detectar si es JSON
    import json
    try:
        parsed = json.loads(response.strip())
        print("\n✅ RESPUESTA ES JSON VÁLIDO")
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    except json.JSONDecodeError:
        print("\n⚠️  La respuesta NO es JSON — el modelo sigue preguntando (puede ser correcto)")

    print("\n✅ Test completo.")


if __name__ == "__main__":
    main()
