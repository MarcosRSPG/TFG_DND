from typing import Any
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE, MONGODB_COLLECTION_ITEMS

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


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


# Now uses only local MongoDB instead of remote API
async def get_remote_catalog() -> list[dict[str, Any]]:
    # Just get all items - filtering by category is done in get_local_docs
    return await get_local_docs()


async def clear_remote_cache() -> None:
    # No cache to clear anymore - we use MongoDB directly
    pass


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


# Now just returns local
async def get_remote_docs(category: str | None = None) -> list[dict[str, Any]]:
    return await get_local_docs(category)


# Returns only local docs (no merging with remote)
async def get_all(category: str | None = None) -> list[dict[str, Any]]:
    return await get_local_docs(category)


async def get_local_doc_by_id(item_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(item_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(item_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": item_id})


# Now just returns local
async def get_remote_doc_by_id(item_id: str) -> dict[str, Any] | None:
    return await get_local_doc_by_id(item_id)