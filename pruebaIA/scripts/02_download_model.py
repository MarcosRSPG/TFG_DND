"""
02_download_model.py — Descarga Qwen3-8B desde Hugging Face.

El modelo se guarda en models/Qwen3-8B/ (ruta relativa a la raíz del proyecto).

Uso:
  python scripts/02_download_model.py

Alternativa manual (más rápida con reanudación):
  huggingface-cli download Qwen/Qwen3-8B --local-dir models/Qwen3-8B

Opciones si no tienes espacio:
  - Qwen/Qwen3-4B  (más pequeño)
  - Qwen/Qwen3-1.7B  (más pequeño aún)
"""

from huggingface_hub import snapshot_download
from pathlib import Path

MODEL_ID = "Qwen/Qwen3-8B"
LOCAL_DIR = Path("models") / "Qwen3-8B"

print("=" * 50)
print(f"Descargando {MODEL_ID}")
print(f"Destino: {LOCAL_DIR}")
print("=" * 50)

# Crear directorio si no existe
LOCAL_DIR.mkdir(parents=True, exist_ok=True)

snapshot_download(
    repo_id=MODEL_ID,
    local_dir=str(LOCAL_DIR),
    local_dir_use_symlinks=False,
)

print(f"\n✅ Modelo descargado en: {LOCAL_DIR}")
print(f"   Peso aproximado: ~15-16 GB")
