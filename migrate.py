"""
D&D 5e API to MongoDB Migration - Super Simple Version
"""

import json
from datetime import datetime, timezone
from urllib.request import urlopen, Request


def fetch(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def clean_item(item):
    """Remove index, add MongoDB metadata."""
    item.pop("index", None)
    item.pop("updated_at", None)
    item.pop("contents", None)
    item["created_by"] = "oficial"
    item["created_at"] = datetime.now(timezone.utc)
    item["updated_at"] = datetime.now(timezone.utc)
    return item


# ==================== CONFIG ====================
MONGO_URI = "mongodb://mongo_root:mongo_root_pass@localhost:27017"
DATABASE_NAME = "db_grimledger"
API_BASE = "https://www.dnd5eapi.co/api/2014"


# ==================== MAIN ====================

from pymongo import MongoClient

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

# 1. Fetch root endpoint
root = fetch(f"{API_BASE}/")
print(f"Found {len(root)} collections")

# 2. For each collection
for name, url in root.items():
    # Determine collection name
    if name in ("equipment", "magic-items"):
        collection_name = "items"
        item_type = "equipment" if name == "equipment" else "magic-item"
    else:
        collection_name = name
        item_type = None

    coll = db[collection_name]

    # 3. Fetch collection list
    print(f"\n[{name}] -> {collection_name}")
    data = fetch(f"https://www.dnd5eapi.co{url}")
    results = data.get("results", [])

    # 4. For each item in collection
    for item_ref in results:
        item_url = item_ref.get("url")
        if not item_url:
            continue

        # Fetch item detail
        item_data = fetch(f"https://www.dnd5eapi.co{item_url}")

        # Add type if merged collection
        if item_type:
            item_data["item_type"] = item_type

        # Clean and add metadata
        item_data = clean_item(item_data)

        # 5. Insert or update by name (upsert)
        coll.replace_one({"name": item_data["name"]}, item_data, upsert=True)

        print(f"  - {item_data['name']}")

    print(f"  Done: {coll.count_documents({})} documents")

print("\nMIGRATION COMPLETE")