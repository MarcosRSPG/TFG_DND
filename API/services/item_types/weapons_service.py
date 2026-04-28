from datetime import datetime, timezone
from typing import Any
from models.item_types.Weapon import WeaponSchema
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from config import MONGODB_COLLECTION_ITEMS
from pydantic import ValidationError


def _to_schema(doc: dict) -> WeaponSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return WeaponSchema(**payload)


async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query = {"equipment_category.index": "weapon"}
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving weapons: {exc}") from exc


async def get_local_doc_by_id(weapon_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(weapon_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(weapon_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": weapon_id, "equipment_category.index": "weapon"})


async def get_all() -> list[WeaponSchema]:
    docs = await get_local_docs()
    weapons = []
    for doc in docs:
        try:
            weapons.append(_to_schema(doc))
        except ValidationError:
            continue
    return weapons


async def get_by_id(weapon_id: str) -> WeaponSchema:
    doc = await get_local_doc_by_id(weapon_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "weapon":
            raise HTTPException(status_code=404, detail="Weapon not found")
        return _to_schema(doc)
    
    raise HTTPException(status_code=404, detail="Weapon not found")


async def create(weapon_schema: WeaponSchema, created_by: str | None) -> WeaponSchema:
    weapon_data = weapon_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()
    
    weapon_data["created_by"] = actor_id
    weapon_data["created_at"] = now
    weapon_data["updated_at"] = now
    
    meta = weapon_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    
    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    weapon_data["meta"] = meta
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    try:
        result = await collection.insert_one(weapon_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating weapon: {exc}") from exc


async def update(weapon_id: str, weapon: WeaponSchema) -> WeaponSchema:
    if not ObjectId.is_valid(weapon_id):
        raise HTTPException(status_code=400, detail="Invalid weapon id")
    
    updates = weapon.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
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
    result = await collection.update_one({"_id": ObjectId(weapon_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Weapon not found")
    
    updated = await collection.find_one({"_id": ObjectId(weapon_id)})
    return _to_schema(updated)


async def delete(weapon_id: str) -> dict:
    if not ObjectId.is_valid(weapon_id):
        raise HTTPException(status_code=400, detail="Invalid weapon id")
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.delete_one({"_id": ObjectId(weapon_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Weapon not found")
    
    return {"deleted": True, "weapon_id": weapon_id}
