from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from config import MONGODB_COLLECTION_BACKGROUNDS
from models.Background import BackgroundSchema


def _doc_key(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


async def _doc_key_async(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


async def clear_remote_cache() -> None:
    # No cache anymore - using local MongoDB
    pass


async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_BACKGROUNDS]
        return await collection.find({}).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds: {exc}") from exc


# Now just returns local
async def get_remote_docs() -> list[dict[str, Any]]:
    return await get_local_docs()


# Returns only local docs
async def get_all_local() -> list[dict[str, Any]]:
    return await get_local_docs()


async def get_local_doc_by_id(background_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(background_id):
        return None
    db = await get_db()
    collection = db[MONGODB_COLLECTION_BACKGROUNDS]
    return await collection.find_one({"_id": ObjectId(background_id)})


# Now just returns local
async def get_remote_doc_by_id(background_id: str) -> dict[str, Any] | None:
    return await get_local_doc_by_id(background_id)


def _to_schema(doc: dict) -> BackgroundSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return BackgroundSchema(**payload)


async def get_all() -> list[BackgroundSchema]:
    docs = await get_all_local()
    return [_to_schema(doc) for doc in docs]


async def get_by_id(background_id: str) -> BackgroundSchema:
    doc = await get_local_doc_by_id(background_id)
    if doc is not None:
        return _to_schema(doc)

    background_real = await get_remote_doc_by_id(background_id)
    if background_real is None:
        raise HTTPException(status_code=404, detail="Background not found")
    return BackgroundSchema(**background_real)


async def create(background_schema: BackgroundSchema) -> BackgroundSchema:
    background_data = background_schema.model_dump(exclude_none=True)
    actor_id = background_data.get("created_by") or "api"
    now = datetime.now(timezone.utc).isoformat()

    background_data["created_by"] = actor_id
    background_data["created_at"] = now
    background_data["updated_at"] = now

    meta = background_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    
    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    background_data["meta"] = meta

    db = await get_db()
    collection = db["backgrounds"]
    try:
        result = await collection.insert_one(background_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating background: {exc}") from exc


async def update(background_id: str, background: BackgroundSchema) -> BackgroundSchema:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    updates = background.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
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
    collection = db["backgrounds"]
    result = await collection.update_one({"_id": ObjectId(background_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")

    updated = await collection.find_one({"_id": ObjectId(background_id)})
    return _to_schema(updated)


async def delete(background_id: str) -> dict:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    db = await get_db()
    collection = db["backgrounds"]
    result = await collection.delete_one({"_id": ObjectId(background_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")

    return {"deleted": True, "background_id": background_id}
