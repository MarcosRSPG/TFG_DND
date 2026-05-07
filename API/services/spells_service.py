from typing import Any
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from models.Spell import Spell
import re
from pydantic import ValidationError


def _json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def _to_schema(spell_data: dict) -> Spell:
    payload = dict(spell_data)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    if not payload.get("index"):
        if mongo_id is not None:
            payload["index"] = str(mongo_id)
        elif payload.get("name"):
            payload["index"] = _build_index(payload["name"])
    return Spell.model_validate(payload)


def _format_spell(spell_data: dict) -> dict:
    try:
        return _to_schema(spell_data).model_dump(exclude_none=True)
    except ValidationError:
        return _json_safe(spell_data)


def _build_index(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "spell"


async def _ensure_persisted_index(collection, spell_data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not spell_data:
        return spell_data

    mongo_id = spell_data.get("_id")
    if mongo_id is None or spell_data.get("index"):
        return spell_data

    persisted_index = str(mongo_id)
    await collection.update_one({"_id": mongo_id}, {"$set": {"index": persisted_index}})
    spell_data["index"] = persisted_index
    return spell_data


async def _find_legacy_spell_by_slug(collection, spell_id: str) -> dict[str, Any] | None:
    legacy_spells = await collection.find(
        {"$or": [{"index": {"$exists": False}}, {"index": None}, {"index": ""}]}
    ).to_list(length=None)

    for spell in legacy_spells:
        if _build_index(spell.get("name", "")) == spell_id:
            return await _ensure_persisted_index(collection, spell)

    return None


async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db["spells"]
        spells = await collection.find({}).to_list(length=None)
        normalized_spells = []
        for spell in spells:
            normalized_spells.append(await _ensure_persisted_index(collection, spell))
        return normalized_spells
    except Exception as e:
        print(f"Error: {e}")
        return []


async def get_local_doc_by_id(spell_id: str) -> dict[str, Any] | None:
    db = await get_db()
    collection = db["spells"]
    if ObjectId.is_valid(spell_id):
        spell = await collection.find_one({"_id": ObjectId(spell_id)})
        if spell:
            return await _ensure_persisted_index(collection, spell)

    spell = await collection.find_one({"index": spell_id})
    if spell:
        return await _ensure_persisted_index(collection, spell)

    return await _find_legacy_spell_by_slug(collection, spell_id)


async def get_remote_doc_by_id(spell_id: str) -> dict[str, Any] | None:
    # No remote docs anymore - using local MongoDB only
    return None


async def get_all() -> list:
    try:
        spells = await get_local_docs()
        spells = [_format_spell(s) for s in spells]
        return spells
    except Exception as e:
        print(f"Error getting all spells: {e}")
        return []


async def get_by_id(spell_id: str) -> dict:
    try:
        local_spell = await get_local_doc_by_id(spell_id)
        if local_spell:
            return _format_spell(local_spell)

        remote_spell = await get_remote_doc_by_id(spell_id)
        if remote_spell:
            return _format_spell(remote_spell)

        return {}
    except Exception as e:
        print(f"Error getting spell {spell_id}: {e}")
        return {}


async def save_local_spell(spell_dict: dict) -> dict:
    try:
        db = await get_db()
        collection = db["spells"]

        if not spell_dict.get("index"):
            mongo_id = ObjectId()
            spell_dict["_id"] = mongo_id
            spell_dict["index"] = str(mongo_id)
            await collection.insert_one(spell_dict)
            created = await collection.find_one({"_id": mongo_id})
            return created

        result = await collection.insert_one(spell_dict)
        created = await collection.find_one({"_id": result.inserted_id})
        return created
    except Exception as e:
        print(f"Error saving spell: {e}")
        raise


async def update_local_spell(spell_id: str, spell_dict: dict) -> dict:
    try:
        if not ObjectId.is_valid(spell_id):
            raise ValueError("Invalid spell id")
        
        db = await get_db()
        collection = db["spells"]
        result = await collection.update_one(
            {"_id": ObjectId(spell_id)},
            {"$set": spell_dict}
        )
        if result.matched_count == 0:
            raise ValueError("Spell not found")
        
        updated = await collection.find_one({"_id": ObjectId(spell_id)})
        return updated
    except Exception as e:
        print(f"Error updating spell: {e}")
        raise


async def delete_local_spell(spell_id: str) -> bool:
    try:
        if not ObjectId.is_valid(spell_id):
            return False
        
        db = await get_db()
        collection = db["spells"]
        result = await collection.delete_one({"_id": ObjectId(spell_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting spell: {e}")
        return False


async def create(spell: dict) -> dict:
    try:
        validated_spell = Spell.model_validate(spell)
        spell_dict = validated_spell.model_dump(exclude_unset=True)
        result = await save_local_spell(spell_dict)
        return _format_spell(result)
    except Exception as e:
        print(f"Error creating spell: {e}")
        raise


def _sanitize_spell_input(data: dict) -> dict:
    """
    Strip empty or structurally invalid sub-objects before Pydantic validation.
    Prevents 422 errors caused by the frontend sending {} for optional nested fields.
    """
    cleaned = {k: v for k, v in data.items()}

    # dc needs a dc_type; discard if absent or empty
    dc = cleaned.get("dc")
    if dc is not None and (not isinstance(dc, dict) or not dc.get("dc_type")):
        del cleaned["dc"]

    # damage needs a damage_type; discard if absent or empty
    damage = cleaned.get("damage")
    if damage is not None and (not isinstance(damage, dict) or not damage.get("damage_type")):
        del cleaned["damage"]

    # area_of_effect needs type + size > 0; discard otherwise
    aoe = cleaned.get("area_of_effect")
    if aoe is not None and (not isinstance(aoe, dict) or not aoe.get("type") or not aoe.get("size")):
        del cleaned["area_of_effect"]

    # image: never overwrite with empty string
    if "image" in cleaned and not cleaned["image"]:
        del cleaned["image"]

    return cleaned


async def update(spell_id: str, spell: dict) -> dict:
    try:
        cleaned = _sanitize_spell_input(spell)
        validated_spell = Spell.model_validate(cleaned)
        spell_dict = validated_spell.model_dump(exclude_unset=True)
        # Extra guard: never overwrite image with empty/null
        if "image" in spell_dict and not spell_dict["image"]:
            del spell_dict["image"]
        result = await update_local_spell(spell_id, spell_dict)
        return _json_safe(result)
    except ValidationError as e:
        print(f"Validation error updating spell {spell_id}: {e.json()}")
        raise
    except Exception as e:
        print(f"Error updating spell {spell_id}: {e}")
        raise


async def delete(spell_id: str) -> bool:
    try:
        return await delete_local_spell(spell_id)
    except Exception as e:
        print(f"Error deleting spell: {e}")
        return False
