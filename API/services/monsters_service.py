from services import monsters_repository
from models.Monster import Monster
from bson import ObjectId
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


async def get_all(page: int = 1, page_size: int = 20) -> list:
    try:
        monsters = await monsters_repository.merge_docs(page=page, page_size=page_size)
        return [_format_monster(m) for m in monsters]
    except Exception as e:
        print(f"Error getting all monsters: {e}")
        return []


async def get_by_id(monster_id: str) -> dict:
    try:
        local_monster = await monsters_repository.get_local_doc_by_id(monster_id)
        if local_monster:
            return _format_monster(local_monster)

        remote_monster = await monsters_repository.get_remote_doc_by_id(monster_id)
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
        result = await monsters_repository.save_local_monster(monster_dict)
        return _format_monster(result)
    except Exception as e:
        print(f"Error creating monster: {e}")
        raise


async def update(monster_id: str, monster: dict) -> dict:
    try:
        validated_monster = Monster.model_validate(monster)
        monster_dict = validated_monster.model_dump(exclude_none=True)
        result = await monsters_repository.update_local_monster(monster_id, monster_dict)
        return _format_monster(result)
    except Exception as e:
        print(f"Error updating monster: {e}")
        raise


async def delete(monster_id: str) -> bool:
    try:
        return await monsters_repository.delete_local_monster(monster_id)
    except Exception as e:
        print(f"Error deleting monster: {e}")
        return False