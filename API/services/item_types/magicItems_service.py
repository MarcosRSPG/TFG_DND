from datetime import datetime, timezone
from typing import Any
from models.item_types.MagicItem import MagicItemSchema
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from config import MONGODB_COLLECTION_ITEMS
from pydantic import ValidationError


def _is_magic_item(doc: dict) -> bool:
    rarity = doc.get("rarity")
    if isinstance(rarity, dict) and rarity.get("name"):
        return True
    
    if isinstance(doc.get("variant"), bool):
        return True
    
    if isinstance(doc.get("url"), str) and "/magic-items/" in doc.get("url", ""):
        return True
    
    return doc.get("equipment_category", {}).get("index") == "magic-items"

def _to_schema(doc: dict) -> MagicItemSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return MagicItemSchema(**payload)

async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query = {"rarity.name": {"$exists": True}}
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving magic items: {exc}") from exc

async def get_local_doc_by_id(magicItem_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(magicItem_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(magicItem_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": magicItem_id, "rarity.name": {"$exists": True}})

async def get_all() -> list[MagicItemSchema]:
    docs = await get_local_docs()
    return [_to_schema(doc) for doc in docs if _is_magic_item(doc)]

async def get_by_id(magicItem_id: str) -> MagicItemSchema:
    doc = await get_local_doc_by_id(magicItem_id)
    if doc is not None:
        if not _is_magic_item(doc):
            raise HTTPException(status_code=404, detail="MagicItem not found")
        return _to_schema(doc)
    
    raise HTTPException(status_code=404, detail="MagicItem not found")

async def create(magicItem_schema: MagicItemSchema, created_by: str | None) -> MagicItemSchema:
    magicItem_data = magicItem_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()
    
    magicItem_data["created_by"] = actor_id
    magicItem_data["created_at"] = now
    magicItem_data["updated_at"] = now
    
    meta = magicItem_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    
    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    magicItem_data["meta"] = meta
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    try:
        result = await collection.insert_one(magicItem_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating magicItem: {exc}") from exc

async def update(magicItem_id: str, magicItem: MagicItemSchema) -> MagicItemSchema:
    if not ObjectId.is_valid(magicItem_id):
        raise HTTPException(status_code=400, detail="Invalid magicItem id")
    
    updates = magicItem.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now
    
    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.update_one({"_id": ObjectId(magicItem_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="MagicItem not found")
    
    updated = await collection.find_one({"_id": ObjectId(magicItem_id)})
    return _to_schema(updated)

async def get_all_magicItems() -> list[MagicItemSchema]:
    return await get_all()

async def get_magicItem_by_id(magicItem_id: str) -> MagicItemSchema:
    return await get_by_id(magicItem_id)

async def create_magicItem(magicItem: MagicItemSchema, created_by: str | None) -> MagicItemSchema:
    return await create(magicItem, created_by)

async def update_magicItem(magicItem_id: str, magicItem: MagicItemSchema) -> MagicItemSchema:
    return await update(magicItem_id, magicItem)

async def delete_magicItem(magicItem_id: str) -> dict:
    return await delete(magicItem_id)

async def delete(magicItem_id: str) -> dict:
    if not ObjectId.is_valid(magicItem_id):
        raise HTTPException(status_code=400, detail="Invalid magicItem id")
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.delete_one({"_id": ObjectId(magicItem_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="MagicItem not found")
    
    return {"deleted": True, "magicItem_id": magicItem_id}
