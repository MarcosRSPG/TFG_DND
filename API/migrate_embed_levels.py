"""
migrate_embed_levels.py
=======================
Migración: embebe class_levels y subclass_levels dentro de sus
documentos padre en las colecciones `classes` y `subclasses`.

Resultado:
  - classes[i].levels  = [ {level: 1, prof_bonus: 2, ...}, ... ]
  - subclasses[i].levels = [ {level: 3, features: [...], ...}, ... ]

El script es IDEMPOTENTE: si el campo `levels` ya existe en un
documento lo omite (no sobreescribe). Ejecutar tantas veces como se
quiera sin riesgo.

Uso:
    python migrate_embed_levels.py [--drop]

Flags:
    --drop   Elimina las colecciones class_levels y subclass_levels
             una vez terminada la migración. Por defecto NO las elimina.
"""

import asyncio
import sys
from collections import defaultdict

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from config import MONGODB_URI, MONGODB_DATABASE


async def run(drop_old: bool = False) -> None:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]

    # ── 1. Migrar class_levels → classes ──────────────────────────────
    print("=== Migrando class_levels -> classes ===")

    all_class_levels = await db["class_levels"].find({}).to_list(length=None)
    print(f"  Encontrados {len(all_class_levels)} documentos en class_levels")

    # Agrupa por el campo 'class' (índice de la clase)
    by_class: dict[str, list] = defaultdict(list)
    for doc in all_class_levels:
        class_index = doc.get("class")
        if class_index:
            # Limpia _id del sub-documento antes de embeber
            clean = {k: v for k, v in doc.items() if k != "_id"}
            by_class[class_index].append(clean)

    classes = await db["classes"].find({}).to_list(length=None)
    print(f"  Encontradas {len(classes)} clases")

    migrated_classes = 0
    skipped_classes = 0

    for cls in classes:
        class_id = cls["_id"]
        class_index = cls.get("index")

        # Si ya tiene levels embebidos, saltar
        if cls.get("levels"):
            print(f"  [SKIP] {cls.get('name', class_index)} — ya tiene levels embebidos")
            skipped_classes += 1
            continue

        levels = by_class.get(class_index, [])
        if not levels:
            print(f"  [WARN] {cls.get('name', class_index)} — sin niveles en class_levels")
            continue

        levels_sorted = sorted(levels, key=lambda x: x.get("level", 0))

        await db["classes"].update_one(
            {"_id": class_id},
            {"$set": {"levels": levels_sorted}}
        )
        print(f"  [OK]   {cls.get('name', class_index)} — {len(levels_sorted)} niveles embebidos")
        migrated_classes += 1

    print(f"\n  Resultado clases: {migrated_classes} migradas, {skipped_classes} omitidas\n")

    # ── 2. Migrar subclass_levels → subclasses ────────────────────────
    print("=== Migrando subclass_levels -> subclasses ===")

    all_subclass_levels = await db["subclass_levels"].find({}).to_list(length=None)
    print(f"  Encontrados {len(all_subclass_levels)} documentos en subclass_levels")

    by_subclass: dict[str, list] = defaultdict(list)
    for doc in all_subclass_levels:
        subclass_index = doc.get("subclass")
        if subclass_index:
            clean = {k: v for k, v in doc.items() if k != "_id"}
            by_subclass[subclass_index].append(clean)

    subclasses = await db["subclasses"].find({}).to_list(length=None)
    print(f"  Encontradas {len(subclasses)} subclases")

    migrated_subclasses = 0
    skipped_subclasses = 0

    for sub in subclasses:
        sub_id = sub["_id"]
        sub_index = sub.get("index")

        if sub.get("levels"):
            print(f"  [SKIP] {sub.get('name', sub_index)} — ya tiene levels embebidos")
            skipped_subclasses += 1
            continue

        levels = by_subclass.get(sub_index, [])
        if not levels:
            print(f"  [WARN] {sub.get('name', sub_index)} — sin niveles en subclass_levels")
            continue

        levels_sorted = sorted(levels, key=lambda x: x.get("level", 0))

        await db["subclasses"].update_one(
            {"_id": sub_id},
            {"$set": {"levels": levels_sorted}}
        )
        print(f"  [OK]   {sub.get('name', sub_index)} — {len(levels_sorted)} niveles embebidos")
        migrated_subclasses += 1

    print(f"\n  Resultado subclases: {migrated_subclasses} migradas, {skipped_subclasses} omitidas\n")

    # ── 3. Eliminar colecciones antiguas (opcional) ───────────────────
    if drop_old:
        print("=== Eliminando colecciones antiguas ===")
        await db["class_levels"].drop()
        print("  [DROPPED] class_levels")
        await db["subclass_levels"].drop()
        print("  [DROPPED] subclass_levels")
    else:
        print("(Colecciones class_levels y subclass_levels conservadas — usa --drop para eliminarlas)")

    client.close()
    print("\n✅ Migración completada")


if __name__ == "__main__":
    drop = "--drop" in sys.argv
    asyncio.run(run(drop_old=drop))
