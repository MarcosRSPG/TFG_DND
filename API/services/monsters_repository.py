from pymongo import MongoClient
from config import API_DND5E, MONGODB_COLLECTION_MONSTERS, MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_DATABASE
from services.remote_catalog_repository import RemoteCatalogRepository

# Initialize MongoDB connection
MONGODB_URI_LOCAL = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"
_mongo = MongoClient(MONGODB_URI_LOCAL)
_db = _mongo[MONGODB_DATABASE]

# Initialize remote catalog repository for monsters
_remote_monsters = RemoteCatalogRepository(
    base_url=API_DND5E,
    list_endpoint="monsters"
)


def get_local_docs() -> list:
    """Fetch all monsters from local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_MONSTERS]
        monsters = list(collection.find({}))
        return monsters
    except Exception as e:
        print(f"Error fetching monsters from MongoDB: {e}")
        return []


def get_remote_docs() -> list:
    """Fetch all monsters from remote D&D API"""
    try:
        return list(_remote_monsters.get_catalog())
    except Exception as e:
        print(f"Error fetching monsters from remote API: {e}")
        return []


def merge_docs() -> list:
    """Merge local and remote monster documents, avoiding duplicates"""
    local_monsters = get_local_docs()
    remote_monsters = get_remote_docs()
    
    # Create a dict indexed by 'index' for deduplication
    merged = {}
    
    # Add remote monsters first
    for monster in remote_monsters:
        if "index" in monster:
            merged[monster["index"]] = monster
    
    # Override with local monsters (local takes precedence)
    for monster in local_monsters:
        if "index" in monster:
            merged[monster["index"]] = monster
    
    return list(merged.values())


def get_local_doc_by_id(monster_id: str) -> dict:
    """Fetch a specific monster from local MongoDB by index/id"""
    try:
        collection = _db[MONGODB_COLLECTION_MONSTERS]
        monster = collection.find_one({"index": monster_id})
        return monster if monster else {}
    except Exception as e:
        print(f"Error fetching monster {monster_id} from MongoDB: {e}")
        return {}


def get_remote_doc_by_id(monster_id: str) -> dict:
    """Fetch a specific monster from remote D&D API by index"""
    try:
        return _remote_monsters.get_by_index(monster_id)
    except Exception as e:
        print(f"Error fetching monster {monster_id} from remote API: {e}")
        return {}


def save_local_monster(monster_data: dict) -> dict:
    """Save a monster to local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_MONSTERS]
        result = collection.insert_one(monster_data)
        monster_data["_id"] = result.inserted_id
        return monster_data
    except Exception as e:
        print(f"Error saving monster: {e}")
        return {}


def update_local_monster(monster_id: str, monster_data: dict) -> dict:
    """Update a monster in local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_MONSTERS]
        result = collection.update_one(
            {"index": monster_id},
            {"$set": monster_data}
        )
        if result.modified_count > 0:
            return collection.find_one({"index": monster_id})
        return {}
    except Exception as e:
        print(f"Error updating monster: {e}")
        return {}


def delete_local_monster(monster_id: str) -> bool:
    """Delete a monster from local MongoDB"""
    try:
        collection = _db[MONGODB_COLLECTION_MONSTERS]
        result = collection.delete_one({"index": monster_id})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting monster: {e}")
        return False
