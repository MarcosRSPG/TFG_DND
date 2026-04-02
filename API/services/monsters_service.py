from services import monsters_repository
from models.Monster import Monster
from bson import ObjectId
import json


def _json_safe(value):
    """Recursively convert ObjectId and other non-JSON types to JSON-safe types"""
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def get_all() -> list:
    """Get all monsters from merged local and remote sources"""
    try:
        monsters = monsters_repository.merge_docs()
        # Convert to JSON-safe format
        monsters = [_json_safe(m) for m in monsters]
        return monsters
    except Exception as e:
        print(f"Error getting all monsters: {e}")
        return []


def get_by_id(monster_id: str) -> dict:
    """Get a specific monster by ID/index"""
    try:
        # Check local first
        local_monster = monsters_repository.get_local_doc_by_id(monster_id)
        if local_monster:
            return _json_safe(local_monster)
        
        # Then check remote
        remote_monster = monsters_repository.get_remote_doc_by_id(monster_id)
        if remote_monster:
            return _json_safe(remote_monster)
        
        return {}
    except Exception as e:
        print(f"Error getting monster {monster_id}: {e}")
        return {}


def create(monster: dict) -> dict:
    """Create a new monster in local MongoDB"""
    try:
        # Validate against schema
        validated_monster = Monster(**monster)
        # Convert back to dict for MongoDB
        monster_dict = validated_monster.model_dump(exclude_unset=True)
        result = monsters_repository.save_local_monster(monster_dict)
        return _json_safe(result)
    except Exception as e:
        print(f"Error creating monster: {e}")
        raise


def update(monster_id: str, monster: dict) -> dict:
    """Update an existing monster in local MongoDB"""
    try:
        # Validate against schema
        validated_monster = Monster(**monster)
        # Convert back to dict for MongoDB
        monster_dict = validated_monster.model_dump(exclude_unset=True)
        result = monsters_repository.update_local_monster(monster_id, monster_dict)
        return _json_safe(result)
    except Exception as e:
        print(f"Error updating monster: {e}")
        raise


def delete(monster_id: str) -> bool:
    """Delete a monster from local MongoDB"""
    try:
        return monsters_repository.delete_local_monster(monster_id)
    except Exception as e:
        print(f"Error deleting monster: {e}")
        return False
