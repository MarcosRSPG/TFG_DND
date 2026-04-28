from typing import Any
from bson import ObjectId
from db import get_db
from config import MONGODB_COLLECTION_MONSTERS
from models.Monster import Monster
import json
from pydantic import ValidationError


def _json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def _to_schema(monster_data: dict) -> Monster:
    payload = dict(monster_data)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return Monster.model_validate(payload)


def _format_monster(monster_data: dict) -> dict:
    try:
        return _to_schema(monster_data).model_dump(exclude_none=True)
    except ValidationError:
        return _json_safe(monster_data)


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
    try:
        monsters = await get_local_docs()
        return [_format_monster(m) for m in monsters]
    except Exception as e:
        print(f"Error getting all monsters: {e}")
        return []


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


async def get_by_id(monster_id: str) -> dict:
    try:
        local_monster = await get_local_doc_by_id(monster_id)
        if local_monster:
            return _format_monster(local_monster)

        remote_monster = await get_remote_doc_by_id(monster_id)
        if remote_monster:
            return _format_monster(remote_monster)

        return {}
    except Exception as e:
        print(f"Error getting monster {monster_id}: {e}")
        return {}


async def create(monster: dict) -> dict:
    try:
        validated_monster = Monster.model_validate(monster)
        monster_dict = validated_monster.model_dump(exclude_none=True)
        result = await save_local_monster(monster_dict)
        return _format_monster(result)
    except Exception as e:
        print(f"Error creating monster: {e}")
        raise


async def update(monster_id: str, monster: dict) -> dict:
    try:
        validated_monster = Monster.model_validate(monster)
        monster_dict = validated_monster.model_dump(exclude_none=True)
        result = await update_local_monster(monster_id, monster_dict)
        return _format_monster(result)
    except Exception as e:
        print(f"Error updating monster: {e}")
        raise


async def delete(monster_id: str) -> bool:
    try:
        return await delete_local_monster(monster_id)
    except Exception as e:
        print(f"Error deleting monster: {e}")
        return False
