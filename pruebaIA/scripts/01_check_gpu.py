"""
01_check_gpu.py — Verifica que PyTorch detecta la GPU correctamente.

Para qué sirve:
  Confirma que CUDA está disponible y que la GPU tiene suficiente VRAM
  para entrenar. Si sale "CUDA disponible: False", no sigas entrenando
  hasta arreglar drivers/CUDA/PyTorch.

Uso:
  python scripts/01_check_gpu.py
"""

import torch

print("=" * 50)
print("CHECK GPU — Entrenamiento Qwen LoRA")
print("=" * 50)

print(f"\nCUDA disponible: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")
    vram_gb = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2)
    print(f"VRAM total: {vram_gb} GB")

    if vram_gb < 8:
        print("\n⚠️  Poca VRAM. Usa Qwen3-1.7B o Qwen3-4B con load_in_4bit=True.")
    elif vram_gb < 16:
        print("\n✅ VRAM suficiente para Qwen3-8B con 4 bits.")
    else:
        print("\n✅ VRAM sobrada para Qwen3-8B entrenando en 4 bits.")
else:
    print("\n❌ No se detecta GPU CUDA.")
    print("   El entrenamiento será inviable o muy lento.")
    print("   Soluciones:")
    print("   - WSL2 con Ubuntu (recomendado)")
    print("   - Instalar CUDA toolkit 12.x")
    print("   - pip install torch --index-url https://download.pytorch.org/whl/cu124")
