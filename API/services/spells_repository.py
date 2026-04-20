from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE, MONGODB_COLLECTION_SPELLS
from config import API_DND5E
from services.remote_catalog_repository import RemoteCatalogRepository

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


_remote_spells = RemoteCatalogRepository(
    base_url=API_DND5E,
    list_endpoint="spells"
)


async def get_local_docs() -> list:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_SPELLS]
        return await collection.find({}).to_list(length=None)
    except Exception as e:
        print(f"Error fetching spells from MongoDB: {e}")
        return []


async def get_remote_docs(page: int = 1, page_size: int = 20) -> list:
    try:
        return await _remote_spells.get_catalog(page=page, page_size=page_size)
    except Exception as e:
        print(f"Error fetching spells from remote API: {e}")
        return []


async def merge_docs(page: int = 1, page_size: int = 20) -> list:
    local_spells = await get_local_docs()
    remote_spells = await get_remote_docs(page=page, page_size=page_size)

    merged = {}
    for spell in remote_spells:
        if "index" in spell:
            merged[spell["index"]] = spell
    for spell in local_spells:
        if "index" in spell:
            merged[spell["index"]] = spell

    start = (page - 1) * page_size
    end = start + page_size
    return list(merged.values())[start:end]


async def get_local_doc_by_id(spell_id: str) -> dict:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_SPELLS]
        spell = await collection.find_one({"index": spell_id})
        return spell if spell else {}
    except Exception as e:
        print(f"Error fetching spell {spell_id} from MongoDB: {e}")
        return {}


async def get_remote_doc_by_id(spell_id: str) -> dict:
    try:
        return await _remote_spells.get_by_index(spell_id)
    except Exception as e:
        print(f"Error fetching spell {spell_id} from remote API: {e}")
        return {}


async def save_local_spell(spell_data: dict) -> dict:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_SPELLS]
        result = await collection.insert_one(spell_data)
        spell_data["_id"] = result.inserted_id
        return spell_data
    except Exception as e:
        print(f"Error saving spell: {e}")
        return {}


async def update_local_spell(spell_id: str, spell_data: dict) -> dict:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_SPELLS]
        result = await collection.update_one(
            {"index": spell_id},
            {"$set": spell_data}
        )
        if result.modified_count > 0:
            return await collection.find_one({"index": spell_id})
        return {}
    except Exception as e:
        print(f"Error updating spell: {e}")
        return {}


async def delete_local_spell(spell_id: str) -> bool:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_SPELLS]
        result = await collection.delete_one({"index": spell_id})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting spell: {e}")
        return False