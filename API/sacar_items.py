"""Script para obtener datos de la API D&D 5e y guardarlos en MongoDB"""
import httpx
from pymongo import MongoClient
from datetime import datetime
import asyncio

API_BASE = "https://www.dnd5eapi.co"
MONGODB_URI = "mongodb://mongo_root:mongo_root_pass@mongodb:27017/db_grimledger?authSource=admin"

# Endpoints a fetchear
ENDPOINTS = [
    "api/classes",
    "api/subclasses", 
    "api/races",
    "api/subraces",
    "api/backgrounds",
    "api/spells",
    "api/monsters",
    "api/equipment",
    "api/magic-items",
    "api/features",
    "api/proficiencies",
    "api/skills",
    "api/languages",
    "api/rules",
    "api/rule-sections",
    "api/conditions",
    "api/damage-types",
    "api/weapon-properties",
    "api/equipment-categories",
    "api/magic-schools",
    "api/alignments",
    "api/ability-scores",
    "api/traits",
]

# Map endpoint to collection name
def get_collection_name(endpoint: str) -> str:
    endpoint = endpoint.replace("api/", "")
    if endpoint == "magic-items":
        return "magic-items"
    if endpoint == "ability-scores":
        return "ability-scores"
    if endpoint == "rule-sections":
        return "rule-sections"
    if endpoint == "equipment-categories":
        return "equipment-categories"
    if endpoint == "magic-schools":
        return "magic-schools"
    return endpoint


async def fetch_from_list(endpoint: str) -> list:
    """Fetch la lista de items de un endpoint"""
    url = f"https://www.dnd5eapi.co/{endpoint}"
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            print(f"GET {url}: {resp.status_code}")
            if resp.status_code != 200:
                return []
            data = resp.json()
            return data.get("results", [])
        except Exception as e:
            print(f"Error: {e}")
            return []


async def fetch_detail(url: str) -> dict | None:
    """Fetch detalle de un item"""
    full_url = f"https://www.dnd5eapi.co{url}"
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            resp = await client.get(full_url)
            if resp.status_code == 200:
                return resp.json()
        except:
            pass
    return None


async def main():
    print(f"Conectando a MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client["db_grimledger"]
    
    total_items = 0
    
    for endpoint in ENDPOINTS:
        collection_name = get_collection_name(endpoint)
        print(f"\n=== {collection_name} ===")
        
        # Fetch list
        results = await fetch_from_list(endpoint)
        if not results:
            print(f"  No results")
            continue
        
        print(f"  Found {len(results)} items, fetching details...")
        
        # Fetch each item
        items = []
        for i, item in enumerate(results):
            detail = await fetch_detail(item.get("url", ""))
            if detail:
                detail["created_by"] = "oficial"
                detail["created_at"] = datetime.utcnow().isoformat()
                detail["updated_at"] = datetime.utcnow().isoformat()
                items.append(detail)
            
            if (i + 1) % 10 == 0:
                print(f"  Progress: {i+1}/{len(results)}")
        
        if items:
            db[collection_name].delete_many({})
            result = db[collection_name].insert_many(items)
            total_items += len(result.inserted_ids)
            print(f"  Inserted {len(result.inserted_ids)} documents")
    
    print(f"\n=== DONE: {total_items} total documents ===")
    
    # Show stats
    print("\n=== Collections ===")
    for coll_name in sorted(db.list_collection_names()):
        count = db[coll_name].count_documents({})
        if count > 0:
            print(f"  {coll_name}: {count} documents")


if __name__ == "__main__":
    asyncio.run(main())