from datetime import datetime, timezone

from models.Weapon import WeaponSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from pydantic import ValidationError

from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME
from services.equipment_repository import get_local_doc_by_id, get_remote_doc_by_id, merge_docs


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_weapons = _db["items"]


def _is_magic_item_doc(doc: dict) -> bool:
    rarity = doc.get("rarity")
    if isinstance(rarity, dict) and rarity.get("name"):
        return True

    if isinstance(doc.get("variant"), bool):
        return True

    if isinstance(doc.get("url"), str) and "/magic-items/" in doc.get("url", ""):
        return True

    return doc.get("equipment_category", {}).get("index") == "magic-items"


def _to_schema(doc: dict) -> WeaponSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return WeaponSchema(**payload)


def get_all() -> list[WeaponSchema]:
    docs = merge_docs("weapon")
    weapons: list[WeaponSchema] = []
    for doc in docs:
        if _is_magic_item_doc(doc):
            continue
        try:
            weapons.append(_to_schema(doc))
        except ValidationError:
            continue
    return weapons


def get_by_id(weapon_id: str) -> WeaponSchema:
    doc = get_local_doc_by_id(weapon_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "weapon" or _is_magic_item_doc(doc):
            raise HTTPException(status_code=404, detail="Weapon not found")
        try:
            return _to_schema(doc)
        except ValidationError as exc:
            raise HTTPException(status_code=404, detail="Weapon not found") from exc

    weapon_real = get_remote_doc_by_id(weapon_id)
    if weapon_real is None:
        raise HTTPException(status_code=404, detail="Weapon not found")
    if weapon_real.get("equipment_category", {}).get("index") != "weapon" or _is_magic_item_doc(weapon_real):
        raise HTTPException(status_code=404, detail="Weapon not found")
    try:
        return WeaponSchema(**weapon_real)
    except ValidationError as exc:
        raise HTTPException(status_code=404, detail="Weapon not found") from exc


def create(weapon_schema: WeaponSchema, created_by: str | None) -> WeaponSchema:
    weapon_data = weapon_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    weapon_data["created_by"] = actor_id
    weapon_data["created_at"] = now
    weapon_data["updated_at"] = now

    meta = weapon_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    weapon_data["meta"] = meta

    try:
        result = _weapons.insert_one(weapon_data)
        created = _weapons.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating weapon: {exc}") from exc


def update(weapon_id: str, weapon: WeaponSchema) -> WeaponSchema:
    if not ObjectId.is_valid(weapon_id):
        raise HTTPException(status_code=400, detail="Invalid weapon id")

    updates = weapon.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _weapons.update_one({"_id": ObjectId(weapon_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Weapon not found")

    updated = _weapons.find_one({"_id": ObjectId(weapon_id)})
    return _to_schema(updated)


def get_all_weapons() -> list[WeaponSchema]:
    return get_all()


def get_weapon_by_id(weapon_id: str) -> WeaponSchema:
    return get_by_id(weapon_id)


def create_weapon(weapon: WeaponSchema, created_by: str | None) -> WeaponSchema:
    return create(weapon, created_by)


def update_weapon(weapon_id: str, weapon: WeaponSchema) -> WeaponSchema:
    return update(weapon_id, weapon)


def delete_weapon(weapon_id: str) -> dict:
    return delete(weapon_id)


def delete(weapon_id: str) -> dict:
    if not ObjectId.is_valid(weapon_id):
        raise HTTPException(status_code=400, detail="Invalid weapon id")

    result = _weapons.delete_one({"_id": ObjectId(weapon_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Weapon not found")

    return {"deleted": True, "weapon_id": weapon_id}
