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


async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db["spells"]
        return await collection.find({}).to_list(length=None)
    except Exception as e:
        print(f"Error: {e}")
        return []


async def get_local_doc_by_id(spell_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(spell_id):
        return None
    db = await get_db()
    collection = db["spells"]
    return await collection.find_one({"_id": ObjectId(spell_id)})


async def get_all() -> list[dict[str, Any]]:
    return await get_local_docs()