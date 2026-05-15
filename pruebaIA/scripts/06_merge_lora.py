"""
06_merge_lora.py — Fusiona el adaptador LoRA con el modelo base.

Después de entrenar, tenés dos opciones:
  A) Mantener modelo base + adaptador por separado (menos espacio, intercambiable)
  B) Fusionar (más simple para exportar y distribuir)

Este script hace la opción B: funde el LoRA en el modelo base y guarda
el resultado en models/qwen3-dnd-merged/.

Uso:
  python scripts/06_merge_lora.py
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from pathlib import Path

# ============================================================
# CONFIGURACIÓN
# ============================================================
BASE_MODEL_PATH = "models/Qwen3-8B"
LORA_PATH = "models/qwen3-dnd-lora"
MERGED_OUTPUT_PATH = "models/qwen3-dnd-merged"


def main():
    print("=" * 50)
    print("FUSIONAR LoRA CON MODELO BASE")
    print("=" * 50)

    # Verificar que existe el LoRA
    if not Path(LORA_PATH).exists():
        raise FileNotFoundError(
            f"No se encuentra el LoRA en {LORA_PATH}. "
            "Ejecutá primero 04_train_lora.py"
        )

    # 1. Cargar tokenizer
    print("\nCargando tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_PATH, trust_remote_code=True)

    # 2. Cargar modelo base en FP16
    print("Cargando modelo base en FP16...")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_PATH,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )

    # 3. Cargar LoRA
    print("Cargando adaptador LoRA...")
    model = PeftModel.from_pretrained(model, LORA_PATH)

    # 4. Fusionar
    print("Fusionando LoRA con modelo base...")
    model = model.merge_and_unload()

    # 5. Guardar
    print(f"Guardando modelo fusionado en {MERGED_OUTPUT_PATH}...")

    Path(MERGED_OUTPUT_PATH).mkdir(parents=True, exist_ok=True)

    model.save_pretrained(
        MERGED_OUTPUT_PATH,
        safe_serialization=True,
    )

    tokenizer.save_pretrained(MERGED_OUTPUT_PATH)

    print(f"\n✅ Modelo fusionado guardado en: {MERGED_OUTPUT_PATH}")
    print("   Incluye config.json, tokenizer, y .safetensors")

    print("\n📦 Tamaño aproximado: ~15-16 GB (FP16)")
    print("   Próximo paso: python scripts/07_export_gguf.py")


if __name__ == "__main__":
    main()
