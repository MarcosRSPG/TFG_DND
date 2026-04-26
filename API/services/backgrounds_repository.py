from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_COLLECTION_BACKGROUNDS, MONGODB_URI, MONGODB_DATABASE

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


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
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds: {exc}") from exc


# Now just returns local
async def get_remote_docs() -> list[dict[str, Any]]:
    return await get_local_docs()


# Returns only local docs
async def get_all() -> list[dict[str, Any]]:
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