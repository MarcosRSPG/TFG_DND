from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


def _character_filter(character_id: str) -> dict[str, Any]:
    if ObjectId.is_valid(character_id):
        return {"$or": [{"_id": ObjectId(character_id)}, {"index": character_id}, {"name": character_id}]}
    return {"$or": [{"index": character_id}, {"name": character_id}]}


async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db["characters"]
        return await collection.find({}).to_list(length=None)
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error retrieving characters: {exc}") from exc


async def get_local_doc_by_id(character_id: str) -> dict[str, Any] | None:
    try:
        db = await get_db()
        collection = db["characters"]
        return await collection.find_one(_character_filter(character_id))
    except Exception:
        return None


async def save_local_character(character_data: dict) -> dict:
    try:
        db = await get_db()
        collection = db["characters"]
        result = await collection.insert_one(character_data)
        character_data["_id"] = result.inserted_id
        return character_data
    except Exception:
        return {}


async def update_local_character(character_id: str, character_data: dict) -> dict:
    try:
        db = await get_db()
        collection = db["characters"]
        result = await collection.update_one(_character_filter(character_id), {"$set": character_data})
        if result.matched_count > 0:
            return await collection.find_one(_character_filter(character_id)) or {}
        return {}
    except Exception:
        return {}


async def delete_local_character(character_id: str) -> bool:
    try:
        db = await get_db()
        collection = db["characters"]
        result = await collection.delete_one(_character_filter(character_id))
        return result.deleted_count > 0
    except Exception:
        return False