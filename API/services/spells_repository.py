from pymongo import MongoClient
from config import API_DND5E, MONGODB_COLLECTION_SPELLS, MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_DATABASE
from services.remote_catalog_repository import RemoteCatalogRepository

# Initialize MongoDB connection
MONGODB_URI_LOCAL = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"
_mongo = MongoClient(MONGODB_URI_LOCAL)
_db = _mongo[MONGODB_DATABASE]

# Initialize remote catalog repository for spells
_remote_spells = RemoteCatalogRepository(
    base_url=API_DND5E,
    list_endpoint="spells"
)


def get_local_docs() -> list:
    """Fetch all spells from local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_SPELLS]
        spells = list(collection.find({}))
        return spells
    except Exception as e:
        print(f"Error fetching spells from MongoDB: {e}")
        return []


def get_remote_docs() -> list:
    """Fetch all spells from remote D&D API"""
    try:
        return list(_remote_spells.get_catalog())
    except Exception as e:
        print(f"Error fetching spells from remote API: {e}")
        return []


def merge_docs() -> list:
    """Merge local and remote spell documents, avoiding duplicates"""
    local_spells = get_local_docs()
    remote_spells = get_remote_docs()
    
    # Create a dict indexed by 'index' for deduplication
    merged = {}
    
    # Add remote spells first
    for spell in remote_spells:
        if "index" in spell:
            merged[spell["index"]] = spell
    
    # Override with local spells (local takes precedence)
    for spell in local_spells:
        if "index" in spell:
            merged[spell["index"]] = spell
    
    return list(merged.values())


def get_local_doc_by_id(spell_id: str) -> dict:
    """Fetch a specific spell from local MongoDB by index/id"""
    try:
        collection = _db[MONGODB_COLLECTION_SPELLS]
        spell = collection.find_one({"index": spell_id})
        return spell if spell else {}
    except Exception as e:
        print(f"Error fetching spell {spell_id} from MongoDB: {e}")
        return {}


def get_remote_doc_by_id(spell_id: str) -> dict:
    """Fetch a specific spell from remote D&D API by index"""
    try:
        return _remote_spells.get_by_index(spell_id)
    except Exception as e:
        print(f"Error fetching spell {spell_id} from remote API: {e}")
        return {}


def save_local_spell(spell_data: dict) -> dict:
    """Save a spell to local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_SPELLS]
        result = collection.insert_one(spell_data)
        spell_data["_id"] = result.inserted_id
        return spell_data
    except Exception as e:
        print(f"Error saving spell: {e}")
        return {}


def update_local_spell(spell_id: str, spell_data: dict) -> dict:
    """Update a spell in local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_SPELLS]
        result = collection.update_one(
            {"index": spell_id},
            {"$set": spell_data}
        )
        if result.modified_count > 0:
            return collection.find_one({"index": spell_id})
        return {}
    except Exception as e:
        print(f"Error updating spell: {e}")
        return {}


def delete_local_spell(spell_id: str) -> bool:
    """Delete a spell from local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_SPELLS]
        result = collection.delete_one({"index": spell_id})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting spell: {e}")
        return False
