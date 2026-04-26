"""
Script para obtener datos de la API D&D 5e y guardarlos en MongoDB
"""
import requests
import httpx
from pymongo import MongoClient
from datetime import datetime
import asyncio
import os

API_BASE = "https://www.dnd5eapi.co/api"
MONGODB_URI = "mongodb://mongo_root:mongo_root_pass@mongodb:27017/db_grimledger?authSource=admin"

# Endpoints a fetchear
ENDPOINTS = [
    "classes",
    "subclasses", 
    "races",
    "subraces",
    "backgrounds",
    "spells",
    "monsters",
    "equipment",
    "magic-items",
    "features",
    "proficiencies",
    "skills",
    "languages",
    "rules",
    "rule-sections",
    "conditions",
    "damage-types",
    "weapon-properties",
    "equipment-categories",
    "magic-schools",
    "alignments",
    "ability-scores",
    "traits",
]


async def fetch_all(endpoint: str) -> list:
    """Fetch todos los items de un endpoint"""
    async with httpx.AsyncClient(timeout=60) as client:
        # Get list
        resp = await client.get(f"{API_BASE}/{endpoint}")
        if resp.status_code != 200:
            print(f"Error fetching {endpoint}: {resp.status_code}")
            return []
        
        data = resp.json()
        results = data.get("results", [])
        
        # Get full details for each item
        items = []
        for i, item in enumerate(results):
            try:
                detail_resp = await client.get(f"{API_BASE}{item['url']}")
                if detail_resp.status_code == 200:
                    item_data = detail_resp.json()
                    item_data["created_by"] = "oficial"
                    item_data["created_at"] = datetime.utcnow()
                    item_data["updated_at"] = datetime.utcnow()
                    items.append(item_data)
                    print(f"  {endpoint}: {i+1}/{len(results)} - {item.get('name', item.get('index'))}")
            except Exception as e:
                print(f"Error fetching {item['url']}: {e}")
        
        return items


async def main():
    print(f"Conectando a MongoDB: {MONGODB_URI.replace('mongo_root_pass', '***')}")
    client = MongoClient(MONGODB_URI)
    db = client["db_grimledger"]
    
    # Create indexes
    for coll_name in db.list_collection_names():
        try:
            db[coll_name].create_index("index")
            db[coll_name].create_index("url")
        except:
            pass
    
    for endpoint in ENDPOINTS:
        collection_name = endpoint if endpoint != "magic-items" else "magicitems"
        if endpoint in ["ability-scores"]:
            collection_name = "ability-scores"
        
        print(f"\n=== Fetching {endpoint} ===")
        items = await fetch_all(endpoint)
        
        if items:
            # Clear old data
            db[collection_name].delete_many({})
            
            # Insert new data
            result = db[collection_name].insert_many(items)
            print(f"Inserted {len(result.inserted_ids)} documents in '{collection_name}'")
    
    print("\n=== DONE ===")
    
    # Show stats
    print("\n=== Collections ===")
    for coll_name in sorted(db.list_collection_names()):
        count = db[coll_name].count_documents({})
        print(f"  {coll_name}: {count} documents")


if __name__ == "__main__":
    asyncio.run(main())