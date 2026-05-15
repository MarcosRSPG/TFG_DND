"""
07_export_gguf.py — Exporta el modelo fusionado a GGUF cuantizado.

Convierte el modelo a formato GGUF Q4_K_M, ideal para ejecutar en
PC con menos recursos (GTX 1070, CPU, etc.) mediante llama-cpp-python.

El GGUF resultante se guarda en models/qwen3-dnd-gguf/.

Uso:
  python scripts/07_export_gguf.py

Requisito: haber ejecutado 06_merge_lora.py primero.
"""

from unsloth import FastLanguageModel
from pathlib import Path

# ============================================================
# CONFIGURACIÓN
# ============================================================
MERGED_MODEL_PATH = "models/qwen3-dnd-merged"
GGUF_OUTPUT_PATH = "models/qwen3-dnd-gguf"


def main():
    print("=" * 50)
    print("EXPORTAR A GGUF — Q4_K_M")
    print("=" * 50)

    # Verificar merged
    if not Path(MERGED_MODEL_PATH).exists():
        raise FileNotFoundError(
            f"No se encuentra el modelo fusionado en {MERGED_MODEL_PATH}. "
            "Ejecutá primero 06_merge_lora.py"
        )

    # 1. Cargar modelo fusionado
    print(f"\nCargando modelo fusionado desde {MERGED_MODEL_PATH}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MERGED_MODEL_PATH,
        max_seq_length=4096,
        load_in_4bit=False,  # Cargamos en FP16 para exportar
    )

    # 2. Exportar a GGUF
    print("\nExportando a GGUF Q4_K_M...")
    print("(Este proceso puede tomar varios minutos)")

    Path(GGUF_OUTPUT_PATH).mkdir(parents=True, exist_ok=True)

    model.save_pretrained_gguf(
        GGUF_OUTPUT_PATH,
        tokenizer,
        quantization_method="q4_k_m",
    )

    # 3. Renombrar para claridad
    gguf_files = list(Path(GGUF_OUTPUT_PATH).glob("*.gguf"))
    if gguf_files:
        src = gguf_files[0]
        dst = Path(GGUF_OUTPUT_PATH) / "qwen3-dnd-q4_k_m.gguf"

        if src != dst:
            import shutil
            shutil.move(str(src), str(dst))
            print(f"  Renombrado a: {dst.name}")

    print(f"\n✅ GGUF guardado en: {GGUF_OUTPUT_PATH}")
    print(f"   Peso aproximado: ~4-5 GB")

    print("\n📦 Ya podés copiar este archivo a cualquier PC.")
    print("   Para usarlo con llama-cpp-python, usá:")
    print(f"     Llama(model_path='{GGUF_OUTPUT_PATH}/qwen3-dnd-q4_k_m.gguf')")


if __name__ == "__main__":
    main()
