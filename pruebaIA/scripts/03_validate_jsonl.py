"""
03_validate_jsonl.py — Valida que los archivos JSONL estén bien formados.

Revisa:
  - Cada línea es JSON válido
  - Tiene el campo "messages"
  - Cada mensaje tiene "role" y "content" válidos
  - Los roles son: system, user, assistant

Uso:
  python scripts/03_validate_jsonl.py
"""

import json
from pathlib import Path

FILES = [
    Path("data/train.jsonl"),
    Path("data/eval.jsonl"),
]

VALID_ROLES = {"system", "user", "assistant"}


def validate_file(path: Path) -> int:
    """Valida un archivo JSONL. Devuelve el número de ejemplos válidos."""
    print(f"\nValidando {path}...")

    if not path.exists():
        print(f"  ⚠️  No existe: {path} — lo salteamos")
        return 0

    total = 0

    with path.open("r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue

            total += 1

            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                raise ValueError(f"  ❌ JSON inválido en línea {line_number}: {e}")

            if "messages" not in obj:
                raise ValueError(f"  ❌ Falta 'messages' en línea {line_number}")

            if not isinstance(obj["messages"], list) or len(obj["messages"]) == 0:
                raise ValueError(f"  ❌ 'messages' debe ser lista no vacía en línea {line_number}")

            for msg in obj["messages"]:
                if "role" not in msg or "content" not in msg:
                    raise ValueError(f"  ❌ Mensaje inválido en línea {line_number}: {msg}")

                if msg["role"] not in VALID_ROLES:
                    raise ValueError(f"  ❌ Role inválido '{msg['role']}' en línea {line_number}")

                if not isinstance(msg["content"], str):
                    raise ValueError(f"  ❌ 'content' debe ser string en línea {line_number}")

    print(f"  ✅ {total} ejemplos válidos")
    return total


if __name__ == "__main__":
    print("=" * 50)
    print("VALIDADOR DE DATASETS JSONL")
    print("=" * 50)

    total_global = 0

    for file in FILES:
        total_global += validate_file(file)

    print(f"\n📊 Total ejemplos válidos: {total_global}")

    if total_global == 0:
        print("\n⚠️  No hay datos. Creá ejemplos en data/train.jsonl antes de entrenar.")
    elif total_global < 50:
        print("\n⚠️  Pocos ejemplos. Recomendado: mínimo 100, ideal 300-500.")
    else:
        print("\n✅ Dataset listo para entrenar.")
