from typing import Any
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE, MONGODB_COLLECTION_ITEMS
from config import API_DND5E
from services.remote_catalog_repository import RemoteCatalogRepository

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


_remote_equipment = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="equipment")
_remote_magic_items = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="magic-items")


_CATEGORY_ALIASES = {
    "adventuringgear": "adventuring-gear",
    "adventuring-gear": "adventuring-gear",
    "armor": "armor",
    "mount": "mount",
    "mounts-and-vehicles": "mounts-and-vehicles",
    "tool": "tool",
    "weapon": "weapon",
    "magicItem": "magic-items",
    "magic-item": "magic-items",
    "magic-items": "magic-items",
}


def normalize_category(category: str | None) -> str | None:
    if category is None:
        return None
    return _CATEGORY_ALIASES.get(category, category)


def _doc_key(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


async def get_remote_catalog(page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
    equipment_docs = await _remote_equipment.get_catalog(page=page, page_size=page_size)
    magic_docs = await _remote_magic_items.get_catalog(page=page, page_size=page_size)

    combined: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for doc in (*equipment_docs, *magic_docs):
        key = _doc_key(doc)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        combined.append(doc)

    return combined


async def clear_remote_cache() -> None:
    _remote_equipment.clear_cache()
    _remote_magic_items.clear_cache()


async def get_local_docs(category: str | None = None) -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query: dict[str, Any] = {}
        normalized_category = normalize_category(category)
        if normalized_category:
            if normalized_category == "magic-items":
                query["rarity.name"] = {"$exists": True}
            else:
                query["equipment_category.index"] = normalized_category
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving items: {exc}") from exc


async def get_remote_docs(category: str | None = None, page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
    normalized_category = normalize_category(category)
    if normalized_category == "magic-items":
        return await _remote_magic_items.get_catalog(page=page, page_size=page_size)

    docs = await get_remote_catalog(page=page, page_size=page_size)
    if normalized_category is None:
        return docs
    return [doc for doc in docs if doc.get("equipment_category", {}).get("index") == normalized_category]


async def merge_docs(category: str | None = None, page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
    local_docs = await get_local_docs(category)
    local_keys = {_doc_key(doc) for doc in local_docs}
    merged_docs = list(local_docs)
    for doc in await get_remote_docs(category, page=page, page_size=page_size):
        if _doc_key(doc) in local_keys:
            continue
        merged_docs.append({**doc, "_id": doc.get("index")})
    
    start = (page - 1) * page_size
    end = start + page_size
    return merged_docs[start:end]


async def get_local_doc_by_id(item_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(item_id):
        return None
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"_id": ObjectId(item_id)})


async def get_remote_doc_by_id(item_id: str) -> dict[str, Any] | None:
    equipment_doc = await _remote_equipment.get_by_index(item_id)
    if equipment_doc is not None:
        return equipment_doc
    return await _remote_magic_items.get_by_index(item_id)