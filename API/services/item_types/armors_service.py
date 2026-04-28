from datetime import datetime, timezone
from typing import Any
from models.item_types.Armor import ArmorSchema
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from config import MONGODB_COLLECTION_ITEMS
from pydantic import ValidationError


def _to_schema(doc: dict) -> ArmorSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return ArmorSchema(**payload)

async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query = {"equipment_category.index": "armor"}
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving armors: {exc}") from exc

async def get_local_doc_by_id(armor_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(armor_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(armor_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": armor_id, "equipment_category.index": "armor"})

async def get_all() -> list[ArmorSchema]:
    docs = await get_local_docs()
    return [_to_schema(doc) for doc in docs]

async def get_by_id(armor_id: str) -> ArmorSchema:
    doc = await get_local_doc_by_id(armor_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "armor":
            raise HTTPException(status_code=404, detail="Armor not found")
        return _to_schema(doc)
    
    raise HTTPException(status_code=404, detail="Armor not found")

async def create(armor_schema: ArmorSchema, created_by: str | None) -> ArmorSchema:
    armor_data = armor_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()
    
    armor_data["created_by"] = actor_id
    armor_data["created_at"] = now
    armor_data["updated_at"] = now
    
    meta = armor_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    
    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    armor_data["meta"] = meta
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    try:
        result = await collection.insert_one(armor_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating armor: {exc}") from exc

async def update(armor_id: str, armor: ArmorSchema) -> ArmorSchema:
    if not ObjectId.is_valid(armor_id):
        raise HTTPException(status_code=400, detail="Invalid armor id")
    
    updates = armor.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
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
    result = await collection.update_one({"_id": ObjectId(armor_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Armor not found")
    
    updated = await collection.find_one({"_id": ObjectId(armor_id)})
    return _to_schema(updated)

async def get_all_armors() -> list[ArmorSchema]:
    return await get_all()

async def get_armor_by_id(armor_id: str) -> ArmorSchema:
    return await get_by_id(armor_id)

async def create_armor(armor: ArmorSchema, created_by: str | None) -> ArmorSchema:
    return await create(armor, created_by)

async def update_armor(armor_id: str, armor: ArmorSchema) -> ArmorSchema:
    return await update(armor_id, armor)

async def delete_armor(armor_id: str) -> dict:
    return await delete(armor_id)

async def delete(armor_id: str) -> dict:
    if not ObjectId.is_valid(armor_id):
        raise HTTPException(status_code=400, detail="Invalid armor id")
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.delete_one({"_id": ObjectId(armor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Armor not found")
    
    return {"deleted": True, "armor_id": armor_id}
