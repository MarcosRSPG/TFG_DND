from datetime import datetime, timezone

from models.Weapon import WeaponSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import requests


from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME, API_DND5E

MONGODB_URI = F"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_weapons = _db["items"]


def _to_schema(doc: dict) -> WeaponSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return WeaponSchema(**payload)


def get_all_weapons() -> list[WeaponSchema]:
    try:
        docs = list(_weapons.find({'equipment_category.index': 'weapon'}))
        try:
            weapons_originales = requests.get(API_DND5E + "weapons").json().get("results", [])
            for weapon in weapons_originales:
                weapon_real = requests.get(API_DND5E + f"weapons/{weapon['index']}").json()
                docs.append({**weapon_real, "_id": weapon_real.get("index")})
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving weapons from external API: {exc}") from exc
        return [_to_schema(doc) for doc in docs]
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving weapons: {exc}") from exc


def get_weapon_by_id(weapon_id: str) -> WeaponSchema:
    if not ObjectId.is_valid(weapon_id):
        raise HTTPException(status_code=400, detail="Invalid weapon id")

    doc = _weapons.find_one({"_id": ObjectId(weapon_id)})
    if not doc:
        # Try to find in external API
        try:
            weapon_real = requests.get(API_DND5E + f"weapons/{weapon_id}").json()
            if weapon_real.get("error"):
                raise HTTPException(status_code=404, detail="Weapon not found")
            return WeaponSchema(**weapon_real)
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving weapon from external API: {exc}") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Weapon not found")
    return _to_schema(doc)


def create_weapon(weapon_schema: WeaponSchema, created_by: str | None) -> WeaponSchema:
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


def update_weapon(weapon_id: str, weapon: WeaponSchema) -> WeaponSchema:
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


def delete_weapon(weapon_id: str) -> dict:
    if not ObjectId.is_valid(weapon_id):
        raise HTTPException(status_code=400, detail="Invalid weapon id")

    result = _weapons.delete_one({"_id": ObjectId(weapon_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Weapon not found")

    return {"deleted": True, "weapon_id": weapon_id}
