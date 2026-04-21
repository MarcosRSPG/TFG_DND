from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import API_DND5E, MONGODB_COLLECTION_BACKGROUNDS, MONGODB_URI, MONGODB_DATABASE
from services.remote_catalog_repository import RemoteCatalogRepository

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


_remote_backgrounds = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="backgrounds")


def _doc_key(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


async def _doc_key_async(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


async def clear_remote_cache() -> None:
    _remote_backgrounds.clear_cache()


async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_BACKGROUNDS]
        return await collection.find({}).to_list(length=None)
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds: {exc}") from exc


async def get_remote_docs() -> list[dict[str, Any]]:
    try:
        return await _remote_backgrounds.get_all()
    except Exception as e:
        print(f"Error fetching remote backgrounds: {e}")
        return []


async def get_all() -> list[dict[str, Any]]:
    local_docs = await get_local_docs()
    local_keys = {_doc_key(doc) for doc in local_docs}
    merged_docs = list(local_docs)
    
    try:
        remote_docs = await get_remote_docs()
        for doc in remote_docs:
            key = _doc_key(doc)
            if key in local_keys:
                continue
            merged_docs.append({**doc, "_id": doc.get("index")})
    except Exception as e:
        print(f"Error merging background docs: {e}")
    
    return merged_docs


async def get_local_doc_by_id(background_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(background_id):
        return None
    db = await get_db()
    collection = db[MONGODB_COLLECTION_BACKGROUNDS]
    return await collection.find_one({"_id": ObjectId(background_id)})


async def get_remote_doc_by_id(background_id: str) -> dict[str, Any] | None:
    return await _remote_backgrounds.get_by_index(background_id)