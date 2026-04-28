"""
setup_db.py — Migración D&D 5e API 2014 → MongoDB local + limpieza de URLs

Uso:
  python setup_db.py           # migra todo y muestra stats al final
  python setup_db.py --test    # solo muestra stats (sin migrar)
  python setup_db.py --clean   # solo limpia /api/2014 en docs existentes

Reemplaza: migrate.py, migrate_data.py, clean_urls.py, test_local_mongo.py
"""

import sys
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen, Request

from dotenv import load_dotenv
from pymongo import MongoClient

# ── Config ─────────────────────────────────────────────────────────────────────
# Carga el .env de API/ relativo a este script (funciona desde cualquier CWD)
env_path = Path(__file__).parent / "API" / ".env"
load_dotenv(env_path)

MONGODB_USERNAME = os.getenv("MONGODB_USERNAME", "mongo_root")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD", "mongo_root_pass")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "db_grimledger")
MONGODB_PORT     = os.getenv("MONGODB_PORT", "27017")

# localhost: se conecta desde el host (fuera de Docker)
MONGO_URI = (
    f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}"
    f"@localhost:{MONGODB_PORT}/?authSource=admin"
)

API_BASE = "https://www.dnd5eapi.co/api/2014"

# equipment y magic-items → colección unificada "items" con campo item_type
COLLECTION_MAP: dict[str, tuple[str, str | None]] = {
    "equipment":   ("items", "equipment"),
    "magic-items": ("items", "magic-item"),
}

# ── HTTP ───────────────────────────────────────────────────────────────────────

def fetch(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


# ── Limpieza de URLs ───────────────────────────────────────────────────────────

def clean_value(value):
    """Elimina prefijos /api/2014 y /api de strings de forma recursiva."""
    if isinstance(value, str):
        # Primero el más específico para no dejar "/2014/..." como resto
        return value.replace("/api/2014", "").replace("/api", "")
    if isinstance(value, list):
        return [clean_value(v) for v in value]
    if isinstance(value, dict):
        return {k: clean_value(v) for k, v in value.items()}
    return value


def clean_doc(doc: dict) -> dict:
    return {k: clean_value(v) for k, v in doc.items()}


# ── Migración ──────────────────────────────────────────────────────────────────

def migrate(db) -> None:
    root = fetch(f"{API_BASE}/")
    print(f"Endpoints encontrados: {len(root)}\n")

    now = datetime.now(timezone.utc).isoformat()

    for name, url_path in root.items():
        coll_name, item_type = COLLECTION_MAP.get(name, (name, None))
        coll = db[coll_name]

        print(f"[{name}] → {coll_name}", flush=True)

        data = fetch(f"https://www.dnd5eapi.co{url_path}")
        results = data.get("results", [])

        upserted = 0
        for ref in results:
            item_url = ref.get("url")
            if not item_url:
                continue

            try:
                item = fetch(f"https://www.dnd5eapi.co{item_url}")
            except Exception as e:
                print(f"  ERROR {item_url}: {e}")
                continue

            # Limpia URLs internas durante la inserción (no hace falta clean_urls aparte)
            item = clean_doc(item)

            # Elimina campo redundante que puede traer la API
            item.pop("contents", None)

            # Metadata
            item.setdefault("created_at", now)
            item["updated_at"] = now
            item["created_by"] = "oficial"

            # Tipo dentro de la colección unificada items
            if item_type:
                item["item_type"] = item_type

            coll.replace_one({"index": item["index"]}, item, upsert=True)
            upserted += 1
            print(f"  ✓ {item.get('index', item.get('name'))}")

        print(f"  → {upserted} docs insertados/actualizados\n")

    print("MIGRACIÓN COMPLETA")


# ── Limpieza sobre datos existentes ───────────────────────────────────────────

def clean_existing(db) -> None:
    """Limpia /api/2014 y /api de todos los documentos ya en la DB."""
    colecciones = db.list_collection_names()
    print(f"Colecciones a limpiar: {len(colecciones)}\n")
    total = 0

    for nombre in colecciones:
        coll = db[nombre]
        actualizados = 0

        for doc in coll.find():
            nuevo_doc = clean_doc(doc)
            if nuevo_doc != doc:
                coll.replace_one({"_id": doc["_id"]}, nuevo_doc)
                actualizados += 1

        status = f"{actualizados} docs actualizados" if actualizados else "sin cambios"
        print(f"  {nombre}: {status}")
        total += actualizados

    print(f"\nTotal docs actualizados: {total}")


# ── Stats ──────────────────────────────────────────────────────────────────────

def show_stats(db) -> None:
    colecciones = sorted(db.list_collection_names())
    print(f"\nColecciones en '{db.name}' ({len(colecciones)} total):")
    for name in colecciones:
        count = db[name].count_documents({})
        print(f"  {name}: {count} docs")


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    args = set(sys.argv[1:])
    test_only  = "--test"  in args
    clean_only = "--clean" in args

    masked = MONGO_URI.replace(MONGODB_PASSWORD, "***")
    print(f"Conectando a: {masked}")

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGODB_DATABASE]

    try:
        db.command("ping")
        print("Conexión OK\n")
    except Exception as e:
        print(f"ERROR de conexión: {e}")
        sys.exit(1)

    if test_only:
        show_stats(db)
    elif clean_only:
        clean_existing(db)
        show_stats(db)
    else:
        migrate(db)
        show_stats(db)

    client.close()


if __name__ == "__main__":
    main()
