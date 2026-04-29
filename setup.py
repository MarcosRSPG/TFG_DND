"""
setup.py — Migra D&D 5e API → MongoDB y descarga imágenes

Uso:
  python setup.py           # migra BD + descarga imágenes
  python setup.py --db      # solo migra BD
  python setup.py --images  # solo descarga imágenes
  python setup.py --test    # muestra stats de la BD
"""

import sys, json, os
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

from dotenv import load_dotenv
from pymongo import MongoClient

# ── Config ──────────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / "API" / ".env")

MONGO_URI = (
    f"mongodb://{os.getenv('MONGODB_USERNAME', 'mongo_root')}:"
    f"{os.getenv('MONGODB_PASSWORD', 'mongo_root_pass')}"
    f"@localhost:{os.getenv('MONGODB_PORT', '27017')}/?authSource=admin"
)
DB_NAME    = os.getenv("MONGODB_DATABASE", "db_grimledger")
API_BASE   = "https://www.dnd5eapi.co/api/2014"
IMAGES_DIR = Path(__file__).parent / "API" / "assets" / "images"

# equipment y magic-items comparten la colección "items"
COLLECTION_MAP = {
    "equipment":   ("items", "equipment"),
    "magic-items": ("items", "magic-item"),
}


def fetch(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def clean(val):
    if isinstance(val, str):  return val.replace("/api/2014", "").replace("/api", "")
    if isinstance(val, list): return [clean(v) for v in val]
    if isinstance(val, dict): return {k: clean(v) for k, v in val.items()}
    return val


# ── Migración BD ────────────────────────────────────────────────────────────────
def run_migrate(db):
    root = fetch(f"{API_BASE}/")
    now  = datetime.now(timezone.utc).isoformat()
    print(f"Endpoints encontrados: {len(root)}\n")

    for name, url_path in root.items():
        coll_name, item_type = COLLECTION_MAP.get(name, (name, None))
        coll    = db[coll_name]
        results = fetch(f"https://www.dnd5eapi.co{url_path}").get("results", [])
        count   = 0
        print(f"[{name}] → {coll_name}")

        for ref in results:
            if not ref.get("url"): continue
            try:
                item = clean(fetch(f"https://www.dnd5eapi.co{ref['url']}"))
            except Exception as e:
                print(f"  ERROR {ref['url']}: {e}"); continue

            item.pop("contents", None)
            item.setdefault("created_at", now)
            item["updated_at"] = now
            item["created_by"] = "oficial"
            if item_type: item["item_type"] = item_type

            coll.replace_one({"index": item["index"]}, item, upsert=True)
            count += 1
            print(f"  ✓ {item.get('index', item.get('name'))}")

        print(f"  → {count} docs\n")

    print("MIGRACIÓN COMPLETA")


# ── Descarga de imágenes ────────────────────────────────────────────────────────
def run_images():
    root = fetch(f"{API_BASE}/")
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    total_ok = total_err = 0

    for nombre in root:
        print(f"\n=== {nombre} ===")
        results = fetch(f"{API_BASE}/{nombre}").get("results", [])
        if not results:
            print("  Sin resultados"); continue

        col_dir = IMAGES_DIR / nombre
        col_dir.mkdir(exist_ok=True)
        ok = err = 0

        for i, item in enumerate(results, 1):
            index = item.get("index", "")
            if not index: continue
            print(f"[{i}/{len(results)}] {item.get('name', index)}")

            try:
                detail     = fetch(f"{API_BASE}/{nombre}/{index}")
                image_path = detail.get("image", "")
                if not image_path: continue

                req = Request(f"https://www.dnd5eapi.co{image_path}", headers={"User-Agent": "Mozilla/5.0"})
                with urlopen(req, timeout=30) as r:
                    (col_dir / f"{index}.png").write_bytes(r.read())

                print(f"  -> {col_dir / f'{index}.png'}")
                ok += 1
            except URLError:
                err += 1

        print(f"  {ok} descargados, {err} errores")
        total_ok += ok; total_err += err

    print(f"\nTOTAL: {total_ok} descargados, {total_err} errores")


# ── Stats ───────────────────────────────────────────────────────────────────────
def show_stats(db):
    colls = sorted(db.list_collection_names())
    print(f"\n{db.name} ({len(colls)} colecciones):")
    for c in colls:
        print(f"  {c}: {db[c].count_documents({})} docs")


# ── Main ────────────────────────────────────────────────────────────────────────
args        = set(sys.argv[1:])
only_db     = "--db"     in args
only_images = "--images" in args
test_only   = "--test"   in args

print("Conectando a MongoDB...")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db     = client[DB_NAME]

try:
    db.command("ping")
    print("Conexión OK\n")
except Exception as e:
    print(f"ERROR de conexión: {e}"); sys.exit(1)

if test_only:
    show_stats(db)
elif only_db:
    run_migrate(db)
    show_stats(db)
elif only_images:
    run_images()
else:
    run_migrate(db)
    run_images()
    show_stats(db)

client.close()
