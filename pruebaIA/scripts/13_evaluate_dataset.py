"""
13_evaluate_dataset.py — Evaluacion completa del dataset para entrenar Qwen LoRA.

Hace:
  1. Carga train.jsonl y clasifica cada ejemplo por TYPE
  2. Estadisticas por tipo: cantidad, longitud de conversacion, mensajes
  3. Valida que el JSON del asistente sea parseable y tenga los campos esperados
  4. Detecta anomalias (JSON mal formado, campos faltantes, tipos incorrectos)
  5. Split estratificado train/eval (90/10) y guarda eval.jsonl
  6. Reporte final con recomendaciones

Uso:
  python scripts/13_evaluate_dataset.py
"""

import json
import re
import math
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

TRAIN_PATH = Path("data/train.jsonl")
EVAL_PATH = Path("data/eval.jsonl")
EVAL_SPLIT = 0.10  # 10% para eval


# ============================================================
# 1. CAMPOS REQUERIDOS POR TIPO
# ============================================================

REQUIRED_FIELDS = {
    "weapon": {
        "required": {
            "name": str,
            "type": str,
            "equipment_category": dict,
            "weapon_category": str,
            "weapon_range": str,
            "category_range": str,
            "cost": dict,
            "damage": dict,
            "range": dict,
            "weight": (int, float),
            "rarity": str,
            "properties": list,
            "url": str,
        },
        "optional": ["extra_damage", "desc"],
    },
    "armor": {
        "required": {
            "name": str,
            "type": str,
            "equipment_category": dict,
            "armor_category": str,
            "armor_class": dict,
            "str_minimum": (int, str),
            "stealth_disadvantage": bool,
            "weight": (int, float),
            "cost": dict,
            "url": str,
        },
        "optional": ["desc"],
    },
    "magicitem": {
        "required": {
            "index": str,
            "name": str,
            "type": str,
            "equipment_category": dict,
            "rarity": dict,
            "variants": list,
            "variant": bool,
            "url": str,
        },
        "optional": ["desc"],
    },
    "tool": {
        "required": {
            "index": str,
            "name": str,
            "equipment_category": dict,
            "tool_category": str,
            "cost": dict,
            "weight": (int, float),
            "url": str,
        },
        "optional": ["desc", "contents", "properties"],
    },
    "mount": {
        "required": {
            "index": str,
            "name": str,
            "equipment_category": dict,
            "vehicle_category": str,
            "cost": dict,
            "speed": dict,
            "capacity": str,
            "weight": (int, float),
            "url": str,
        },
        "optional": ["desc", "contents", "properties"],
    },
    "adventuringgear": {
        "required": {
            "index": str,
            "name": str,
            "equipment_category": dict,
            "gear_category": dict,
            "cost": dict,
            "weight": (int, float),
            "url": str,
        },
        "optional": ["desc", "contents", "properties"],
    },
    "monster": {
        "required": {
            "index": str,
            "name": str,
            "size": str,
            "type": str,
            "alignment": str,
            "armor_class": list,
            "hit_points": (int, float),
            "hit_dice": str,
            "speed": dict,
            "strength": int,
            "dexterity": int,
            "constitution": int,
            "intelligence": int,
            "wisdom": int,
            "charisma": int,
            "senses": dict,
            "challenge_rating": str,
            "xp": int,
            "url": str,
        },
        "optional": ["desc"],
    },
    "spell": {
        "required": {
            "index": str,
            "name": str,
            "range": str,
            "components": list,
            "ritual": bool,
            "duration": str,
            "concentration": bool,
            "casting_time": str,
            "level": int,
            "school": dict,
            "url": str,
        },
        "optional": ["desc", "damage", "heal_at_slot_level"],
    },
    "character": {
        "required": {
            "name": str,
            "level": int,
            "character_class": dict,
            "race": dict,
            "alignment": str,
            "background": dict,
            "hit_points": int,
            "hit_dice": str,
            "strength": int,
            "dexterity": int,
            "constitution": int,
            "intelligence": int,
            "wisdom": int,
            "charisma": int,
            "proficiency_bonus": int,
            "speed": dict,
            "inventory": dict,
        },
        "optional": ["traits", "custom_traits"],
    },
    "race": {
        "required": {
            "index": str,
            "name": str,
            "speed": (int, float),
            "ability_bonuses": list,
            "size": str,
            "url": str,
        },
        "optional": ["age", "alignment", "size_description", "language_desc"],
    },
    "class": {
        "required": {
            "index": str,
            "name": str,
            "hit_die": int,
            "url": str,
        },
        "optional": [
            "proficiency_choices", "proficiencies", "saving_throws",
            "starting_equipment", "starting_equipment_options",
            "class_levels", "subclasses",
        ],
    },
    "subclass": {
        "required": {
            "index": str,
            "class": dict,
            "name": str,
            "subclass_flavor": str,
            "url": str,
        },
        "optional": ["desc", "subclass_levels", "spells"],
    },
    "subrace": {
        "required": {
            "index": str,
            "name": str,
            "race": dict,
            "desc": str,
            "ability_bonuses": list,
            "racial_traits": list,
            "url": str,
        },
        "optional": [],
    },
    "background": {
        "required": {
            "index": str,
            "name": str,
            "url": str,
        },
        "optional": ["starting_proficiencies", "starting_equipment", "language_desc"],
    },
}

VALID_TYPES = set(REQUIRED_FIELDS.keys())

# ============================================================
# 2. FUNCIONES AUXILIARES
# ============================================================

TYPE_RE = re.compile(r'TYPE:\s*(\w+)')


def extract_type(system_msg: str) -> str | None:
    """Extrae el TYPE del system message."""
    m = TYPE_RE.search(system_msg)
    return m.group(1).lower() if m else None


def parse_json(content: str) -> tuple[bool, dict | str]:
    """Intenta parsear un string como JSON. Devuelve (ok, objeto|error)."""
    try:
        obj = json.loads(content)
        if isinstance(obj, dict):
            return True, obj
        return False, "El JSON no es un diccionario (es lista u otro tipo)"
    except json.JSONDecodeError as e:
        return False, f"Error de parseo: {e}"


def validate_structure(data: dict, expected_type: str) -> list[str]:
    """Valida que un dict tenga los campos requeridos para un tipo dado."""
    errors = []
    spec = REQUIRED_FIELDS.get(expected_type)
    if not spec:
        return [f"Tipo desconocido: {expected_type}"]

    for field, expected_types in spec["required"].items():
        if field not in data:
            errors.append(f"Falta campo requerido '{field}'")
            continue

        value = data[field]
        if not isinstance(expected_types, tuple):
            expected_types = (expected_types,)
        if not any(isinstance(value, t) for t in expected_types):
            type_names = "/".join(t.__name__ for t in expected_types)
            actual = type(value).__name__
            errors.append(f"Campo '{field}': se esperaba {type_names}, se obtuvo {actual} (valor: {repr(value)[:50]})")

    return errors


# ============================================================
# 3. CARGA Y CLASIFICACION
# ============================================================

def load_dataset(path: Path) -> list[dict]:
    """Carga un archivo JSONL y parsea cada linea."""
    examples = []
    with path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                examples.append(obj)
            except json.JSONDecodeError as e:
                print(f"  [ERROR] Linea {i}: JSON invalido - {e}")
    return examples


def classify_examples(examples: list[dict]) -> dict:
    """Clasifica ejemplos por TYPE y devuelve estadisticas."""
    by_type = defaultdict(list)
    errors = []

    for i, ex in enumerate(examples):
        messages = ex.get("messages", [])
        if not messages:
            errors.append((i, "Sin mensajes"))
            continue

        system_msg = None
        for m in messages:
            if m.get("role") == "system":
                system_msg = m.get("content", "")
                break

        if not system_msg:
            errors.append((i, "Sin system message"))
            continue

        ex_type = extract_type(system_msg)
        if not ex_type:
            errors.append((i, f"No se pudo extraer TYPE de: {system_msg[:80]}"))
            continue

        if ex_type not in VALID_TYPES:
            errors.append((i, f"TYPE desconocido: {ex_type}"))
            continue

        by_type[ex_type].append((i, ex))

    return dict(by_type), errors


# ============================================================
# 4. VALIDACION DE JSON
# ============================================================

def validate_assistant_json(examples: list[dict]) -> dict:
    """Valida el ultimo mensaje de cada ejemplo (debe ser JSON del asistente)."""
    stats = {
        "total": 0,
        "valid_json": 0,
        "valid_structure": 0,
        "by_type": defaultdict(lambda: {"total": 0, "json_ok": 0, "struct_ok": 0}),
        "errors": [],
    }

    for i, ex in enumerate(examples):
        messages = ex.get("messages", [])
        if not messages:
            continue

        last = messages[-1]
        if last.get("role") != "assistant":
            stats["errors"].append((i, "Ultimo mensaje no es del assistant"))
            continue

        content = last.get("content", "").strip()
        if not content:
            stats["errors"].append((i, "Assistant content vacio"))
            continue

        stats["total"] += 1

        ex_type = None
        for m in messages:
            if m.get("role") == "system":
                ex_type = extract_type(m.get("content", ""))
                break

        if not ex_type:
            continue

        bt = stats["by_type"][ex_type]
        bt["total"] += 1

        ok, result = parse_json(content)
        if not ok:
            stats["errors"].append((i, f"[{ex_type}] JSON invalido: {result}"))
            continue

        bt["json_ok"] += 1
        stats["valid_json"] += 1

        struct_errors = validate_structure(result, ex_type)
        if struct_errors:
            for err in struct_errors:
                stats["errors"].append((i, f"[{ex_type}] {err}"))
        else:
            bt["struct_ok"] += 1
            stats["valid_structure"] += 1

    return stats


# ============================================================
# 5. SPLIT ESTRATIFICADO
# ============================================================

def stratified_split(by_type: dict, eval_ratio: float = 0.10) -> tuple[list, list]:
    """Split train/eval manteniendo proporcion por tipo."""
    import random

    train = []
    eval_set = []

    for ex_type, examples in sorted(by_type.items()):
        n = len(examples)
        n_eval = max(1, round(n * eval_ratio))

        indices = list(range(n))
        random.Random(3407).shuffle(indices)

        eval_indices = set(indices[:n_eval])
        for j, (orig_idx, ex) in enumerate(examples):
            if j in eval_indices:
                eval_set.append(ex)
            else:
                train.append(ex)

    return train, eval_set


# ============================================================
# 6. METRICAS DE CONVERSACION
# ============================================================

def conversation_metrics(by_type: dict) -> dict:
    """Calcula metricas por tipo: largo de conversacion, roles, etc."""
    metrics = {}

    for ex_type, examples in by_type.items():
        msg_counts = []
        user_msg_lengths = []
        assistant_msg_lengths = []

        for _, ex in examples:
            msgs = ex.get("messages", [])
            msg_counts.append(len(msgs))
            for m in msgs:
                if m["role"] == "user":
                    user_msg_lengths.append(len(m.get("content", "")))
                elif m["role"] == "assistant":
                    assistant_msg_lengths.append(len(m.get("content", "")))

        metrics[ex_type] = {
            "count": len(examples),
            "avg_msgs": sum(msg_counts) / len(msg_counts) if msg_counts else 0,
            "min_msgs": min(msg_counts) if msg_counts else 0,
            "max_msgs": max(msg_counts) if msg_counts else 0,
            "total_messages": sum(msg_counts),
            "avg_user_len": sum(user_msg_lengths) / len(user_msg_lengths) if user_msg_lengths else 0,
            "avg_assistant_len": sum(assistant_msg_lengths) / len(assistant_msg_lengths) if assistant_msg_lengths else 0,
        }

    return metrics


# ============================================================
# 7. REPORTE
# ============================================================

def print_report(
    total: int,
    by_type: dict,
    metrics: dict,
    validation: dict,
    errors: list,
    train_count: int,
    eval_count: int,
):
    """Imprime reporte formateado."""
    sep = "=" * 68

    print(f"\n{sep}")
    print("  EVALUACION DEL DATASET - Qwen LoRA")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(sep)

    # Resumen general
    print(f"\n  TOTAL: {total} ejemplos")
    print(f"  Train: {train_count}  |  Eval: {eval_count}  ({EVAL_SPLIT*100:.0f}%)")
    print(sep)

    # Distribucion por tipo
    print(f"\n  {'TIPO':<20} {'CANT':>5} {'%':>5}  {'MSGS/PROM':>9} {'USER(L)':>8} {'ASST(L)':>9}  {'JSON':>5} {'ESTRUC':>7}")
    print(f"  {'-'*20} {'-'*5} {'-'*5}  {'-'*9} {'-'*8} {'-'*9}  {'-'*5} {'-'*7}")

    sorted_types = sorted(by_type.keys(), key=lambda t: len(by_type[t]), reverse=True)
    for ex_type in sorted_types:
        m = metrics.get(ex_type, {})
        v = validation.get("by_type", {}).get(ex_type, {})
        pct = len(by_type[ex_type]) / total * 100 if total else 0
        json_pct = v["json_ok"] / v["total"] * 100 if v["total"] else 0
        struct_pct = v["struct_ok"] / v["total"] * 100 if v["total"] else 0
        print(f"  {ex_type:<20} {m.get('count',0):>5} {pct:>4.0f}%  "
              f"{m.get('avg_msgs',0):>5.1f}     {m.get('avg_user_len',0):>4.0f}   {m.get('avg_assistant_len',0):>5.0f}   "
              f"{json_pct:>3.0f}%  {struct_pct:>4.0f}%")

    print(f"  {'-'*20} {'-'*5} {'-'*5}  {'-'*9} {'-'*8} {'-'*9}  {'-'*5} {'-'*7}")
    total_avg_msgs = sum(m["avg_msgs"] * m["count"] for m in metrics.values()) / total if total else 0
    total_avg_user = sum(m["avg_user_len"] * m["count"] for m in metrics.values()) / total if total else 0
    total_avg_asst = sum(m["avg_assistant_len"] * m["count"] for m in metrics.values()) / total if total else 0
    print(f"  {'TOTAL':<20} {total:>5}   100%  "
          f"{total_avg_msgs:>5.1f}     {total_avg_user:>4.0f}   {total_avg_asst:>5.0f}   "
          f"{validation['valid_json']/total*100:>3.0f}%  {validation['valid_structure']/total*100:>4.0f}%")

    # Errores de clasificacion
    if errors:
        print(f"\n  [WARN] ANOMALIAS DE CLASIFICACION: {len(errors)}")
        for idx, err in errors[:10]:
            print(f"     #{idx}: {err}")
        if len(errors) > 10:
            print(f"     ... y {len(errors) - 10} mas")
    else:
        print(f"\n  [OK] Sin anomalias de clasificacion")

    # Errores de validacion JSON
    val_errors = validation.get("errors", [])
    if val_errors:
        print(f"\n  [WARN] ERRORES DE VALIDACION JSON: {len(val_errors)}")
        # agrupar por tipo de error
        summary = Counter(err.split(":")[1].strip() if ":" in err else err for _, err in val_errors[:30])
        if len(val_errors) > 10:
            print(f"     Mostrando primeros 30 de {len(val_errors)}:")
        for _, err in val_errors[:30]:
            print(f"     #{_}: {err}")
    else:
        print(f"\n  [OK] Todos los JSON tienen la estructura esperada.")

    # Recomendaciones
    print(f"\n{sep}")
    print("  RECOMENDACIONES")
    print(sep)

    if total < 100:
        print("  [BAJA] Pocos ejemplos. Minimo recomendado: 300+")
    elif total < 300:
        print("  [MEDIA] Aceptable. Ideal: 300+")
    else:
        print("  [OK] Buena cantidad de ejemplos.")

    if validation["valid_json"] < total:
        bad = total - validation["valid_json"]
        print(f"  [BAJA] {bad} ejemplos tienen JSON invalido - revisar generador")
    else:
        print(f"  [OK] Todos los assistant messages tienen JSON valido.")

    if validation["valid_structure"] < total:
        bad = total - validation["valid_structure"]
        print(f"  [MEDIA] {bad} ejemplos tienen campos faltantes o tipos incorrectos")
    else:
        print(f"  [OK] Todos los JSON tienen la estructura esperada.")

    small_types = [t for t, m in metrics.items() if m["count"] < 5]
    if small_types:
        print(f"  [MEDIA] Tipos con pocos ejemplos: {', '.join(small_types)}")
    else:
        print(f"  [OK] Todos los tipos tienen 5+ ejemplos.")

    avg_msgs = total_avg_msgs
    if avg_msgs < 3:
        print("  [MEDIA] Conversaciones muy cortas (promedio < 3 mensajes). Considera extenderlas.")
    elif avg_msgs >= 5:
        print(f"  [OK] Buen promedio de mensajes por conversacion ({avg_msgs:.1f}).")

    print(f"\n{sep}\n")


# ============================================================
# 8. MAIN
# ============================================================

def main():
    print("=" * 68)
    print("  EVALUACION COMPLETA DEL DATASET")
    print("=" * 68)

    # Cargar dataset
    print("\n[+] Cargando dataset...")
    examples = load_dataset(TRAIN_PATH)
    if not examples:
        print("[ERROR] No se encontraron ejemplos en data/train.jsonl")
        return

    print(f"   {len(examples)} ejemplos cargados")

    # Clasificar por TYPE
    print("\n[+] Clasificando por TYPE...")
    by_type, class_errors = classify_examples(examples)

    total_classified = sum(len(v) for v in by_type.values())
    print(f"   {total_classified}/{len(examples)} clasificados correctamente")

    # Metricas de conversacion
    print("\n[+] Calculando metricas...")
    metrics = conversation_metrics(by_type)

    # Validar JSON del asistente
    print("\n[+] Validando JSON del asistente...")
    validation = validate_assistant_json(examples)
    print(f"   {validation['valid_json']}/{validation['total']} JSONs parseables")
    print(f"   {validation['valid_structure']}/{validation['total']} estructuras correctas")

    # Split estratificado
    print(f"\n[+] Dividiendo train/eval ({EVAL_SPLIT*100:.0f}% eval)...")
    train, eval_set = stratified_split(by_type, EVAL_SPLIT)
    print(f"   Train: {len(train)}  |  Eval: {len(eval_set)}")

    # Guardar eval
    with EVAL_PATH.open("w", encoding="utf-8") as f:
        for ex in eval_set:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"   [OK] Guardado: {EVAL_PATH}")

    # Actualizar train con los que quedaron
    with TRAIN_PATH.open("w", encoding="utf-8") as f:
        for ex in train:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"   [OK] Actualizado: {TRAIN_PATH} ({len(train)} ejemplos)")

    # Reporte
    print_report(
        total=len(examples),
        by_type=by_type,
        metrics=metrics,
        validation=validation,
        errors=class_errors,
        train_count=len(train),
        eval_count=len(eval_set),
    )


if __name__ == "__main__":
    main()
