from services import spells_repository
from models.Spell import Spell
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
    """Get all spells from merged local and remote sources"""
    try:
        spells = spells_repository.merge_docs()
        # Convert to JSON-safe format
        spells = [_json_safe(s) for s in spells]
        return spells
    except Exception as e:
        print(f"Error getting all spells: {e}")
        return []


def get_by_id(spell_id: str) -> dict:
    """Get a specific spell by ID/index"""
    try:
        # Check local first
        local_spell = spells_repository.get_local_doc_by_id(spell_id)
        if local_spell:
            return _json_safe(local_spell)
        
        # Then check remote
        remote_spell = spells_repository.get_remote_doc_by_id(spell_id)
        if remote_spell:
            return _json_safe(remote_spell)
        
        return {}
    except Exception as e:
        print(f"Error getting spell {spell_id}: {e}")
        return {}


def create(spell: dict) -> dict:
    """Create a new spell in local MongoDB"""
    try:
        # Validate against schema
        validated_spell = Spell(**spell)
        # Convert back to dict for MongoDB
        spell_dict = validated_spell.model_dump(exclude_unset=True)
        result = spells_repository.save_local_spell(spell_dict)
        return _json_safe(result)
    except Exception as e:
        print(f"Error creating spell: {e}")
        raise


def update(spell_id: str, spell: dict) -> dict:
    """Update an existing spell in local MongoDB"""
    try:
        # Validate against schema
        validated_spell = Spell(**spell)
        # Convert back to dict for MongoDB
        spell_dict = validated_spell.model_dump(exclude_unset=True)
        result = spells_repository.update_local_spell(spell_id, spell_dict)
        return _json_safe(result)
    except Exception as e:
        print(f"Error updating spell: {e}")
        raise


def delete(spell_id: str) -> bool:
    """Delete a spell from local MongoDB"""
    try:
        return spells_repository.delete_local_spell(spell_id)
    except Exception as e:
        print(f"Error deleting spell: {e}")
        return False
