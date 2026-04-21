from services import spells_repository
from models.Spell import Spell
from bson import ObjectId


def _json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


async def get_all() -> list:
    try:
        spells = await spells_repository.get_all()
        spells = [_json_safe(s) for s in spells]
        return spells
    except Exception as e:
        print(f"Error getting all spells: {e}")
        return []


async def get_by_id(spell_id: str) -> dict:
    try:
        local_spell = await spells_repository.get_local_doc_by_id(spell_id)
        if local_spell:
            return _json_safe(local_spell)

        remote_spell = await spells_repository.get_remote_doc_by_id(spell_id)
        if remote_spell:
            return _json_safe(remote_spell)

        return {}
    except Exception as e:
        print(f"Error getting spell {spell_id}: {e}")
        return {}


async def create(spell: dict) -> dict:
    try:
        validated_spell = Spell(**spell)
        spell_dict = validated_spell.model_dump(exclude_unset=True)
        result = await spells_repository.save_local_spell(spell_dict)
        return _json_safe(result)
    except Exception as e:
        print(f"Error creating spell: {e}")
        raise


async def update(spell_id: str, spell: dict) -> dict:
    try:
        validated_spell = Spell(**spell)
        spell_dict = validated_spell.model_dump(exclude_unset=True)
        result = await spells_repository.update_local_spell(spell_id, spell_dict)
        return _json_safe(result)
    except Exception as e:
        print(f"Error updating spell: {e}")
        raise


async def delete(spell_id: str) -> bool:
    try:
        return await spells_repository.delete_local_spell(spell_id)
    except Exception as e:
        print(f"Error deleting spell: {e}")
        return False