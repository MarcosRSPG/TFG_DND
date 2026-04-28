from datetime import datetime, timezone
from typing import Any
from models.item_types.AdventuringGear import AdventuringGearSchema
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from config import MONGODB_COLLECTION_ITEMS
from pydantic import ValidationError


def _to_schema(doc: dict) -> AdventuringGearSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return AdventuringGearSchema(**payload)

async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query = {"equipment_category.index": "adventuring-gear"}
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving adventuring gears: {exc}") from exc

async def get_local_doc_by_id(adventuringgear_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(adventuringgear_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(adventuringgear_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": adventuringgear_id, "equipment_category.index": "adventuring-gear"})

async def get_all() -> list[AdventuringGearSchema]:
    docs = await get_local_docs()
    return [_to_schema(doc) for doc in docs]

async def get_by_id(adventuringgear_id: str) -> AdventuringGearSchema:
    doc = await get_local_doc_by_id(adventuringgear_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "adventuring-gear":
            raise HTTPException(status_code=404, detail="Adventuring Gear not found")
        return _to_schema(doc)
    
    raise HTTPException(status_code=404, detail="Adventuring Gear not found")

async def create(adventuringgear_schema: AdventuringGearSchema, created_by: str | None) -> AdventuringGearSchema:
    adventuringgear_data = adventuringgear_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()
    
    adventuringgear_data["created_by"] = actor_id
    adventuringgear_data["created_at"] = now
    adventuringgear_data["updated_at"] = now
    
    meta = adventuringgear_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    
    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    adventuringgear_data["meta"] = meta
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    try:
        result = await collection.insert_one(adventuringgear_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating adventuring gear: {exc}") from exc

async def update(adventuringgear_id: str, adventuringgear: AdventuringGearSchema) -> AdventuringGearSchema:
    if not ObjectId.is_valid(adventuringgear_id):
        raise HTTPException(status_code=400, detail="Invalid adventuring gear id")
    
    updates = adventuringgear.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
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
    result = await collection.update_one({"_id": ObjectId(adventuringgear_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Adventuring Gear not found")
    
    updated = await collection.find_one({"_id": ObjectId(adventuringgear_id)})
    return _to_schema(updated)

async def get_all_adventuringgears() -> list[AdventuringGearSchema]:
    return await get_all()

async def get_adventuringgear_by_id(adventuringgear_id: str) -> AdventuringGearSchema:
    return await get_by_id(adventuringgear_id)

async def create_adventuringgear(adventuringgear_schema: AdventuringGearSchema, created_by: str | None) -> AdventuringGearSchema:
    return await create(adventuringgear_schema, created_by)

async def update_adventuringgear(adventuringgear_id: str, adventuringgear: AdventuringGearSchema) -> AdventuringGearSchema:
    return await update(adventuringgear_id, adventuringgear)

async def delete_adventuringgear(adventuringgear_id: str) -> dict:
    return await delete(adventuringgear_id)

async def delete(adventuringgear_id: str) -> dict:
    if not ObjectId.is_valid(adventuringgear_id):
        raise HTTPException(status_code=400, detail="Invalid adventuring gear id")
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.delete_one({"_id": ObjectId(adventuringgear_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Adventuring Gear not found")
    
    return {"deleted": True, "adventuringgear_id": adventuringgear_id}
