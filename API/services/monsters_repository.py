import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE, MONGODB_COLLECTION_MONSTERS

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


async def get_local_docs() -> list:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_MONSTERS]
        return await collection.find({}).to_list(length=None)
    except Exception as e:
        print(f"Error fetching monsters from MongoDB: {e}")
        return []


# For backwards compatibility - now just returns local
async def get_remote_docs() -> list:
    return await get_local_docs()


async def get_all() -> list:
    return await get_local_docs()


async def get_local_doc_by_id(monster_id: str) -> dict:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_MONSTERS]
        monster = await collection.find_one({"index": monster_id})
        return monster if monster else {}
    except Exception as e:
        print(f"Error fetching monster {monster_id} from MongoDB: {e}")
        return {}


# For backwards compatibility - now just returns local
async def get_remote_doc_by_id(monster_id: str) -> dict:
    return await get_local_doc_by_id(monster_id)


async def get_remote_doc_by_id(monster_id: str) -> dict:
    try:
        return await _remote_monsters.get_by_index(monster_id)
    except Exception as e:
        print(f"Error fetching monster {monster_id} from remote API: {e}")
        return {}


async def save_local_monster(monster_data: dict) -> dict:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_MONSTERS]
        result = await collection.insert_one(monster_data)
        monster_data["_id"] = result.inserted_id
        return monster_data
    except Exception as e:
        print(f"Error saving monster: {e}")
        return {}


async def update_local_monster(monster_id: str, monster_data: dict) -> dict:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_MONSTERS]
        result = await collection.update_one(
            {"index": monster_id},
            {"$set": monster_data}
        )
        if result.modified_count > 0:
            return await collection.find_one({"index": monster_id})
        return {}
    except Exception as e:
        print(f"Error updating monster: {e}")
        return {}


async def delete_local_monster(monster_id: str) -> bool:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_MONSTERS]
        result = await collection.delete_one({"index": monster_id})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting monster: {e}")
        return False