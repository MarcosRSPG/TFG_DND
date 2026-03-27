from datetime import datetime, timezone

from models.Armor import ArmorSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import requests


from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME, API_DND5E

MONGODB_URI = F"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_armors = _db["items"]


def _to_schema(doc: dict) -> ArmorSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return ArmorSchema(**payload)


def get_all_armors() -> list[ArmorSchema]:
    try:
        docs = list(_armors.find({'equipment_category.index': 'armor'}))
        try:
            armors_originales = requests.get(API_DND5E + "armors").json().get("results", [])
            for armor in armors_originales:
                armor_real = requests.get(API_DND5E + f"armors/{armor['index']}").json()
                docs.append({**armor_real, "_id": armor_real.get("index")})
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving armors from external API: {exc}") from exc
        return [_to_schema(doc) for doc in docs]
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving armors: {exc}") from exc


def get_armor_by_id(armor_id: str) -> ArmorSchema:
    if not ObjectId.is_valid(armor_id):
        raise HTTPException(status_code=400, detail="Invalid armor id")

    doc = _armors.find_one({"_id": ObjectId(armor_id)})
    if not doc:
        # Try to find in external API
        try:
            armor_real = requests.get(API_DND5E + f"armors/{armor_id}").json()
            if armor_real.get("error"):
                raise HTTPException(status_code=404, detail="Armor not found")
            return ArmorSchema(**armor_real)
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving armor from external API: {exc}") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Armor not found")
    return _to_schema(doc)


def create_armor(armor_schema: ArmorSchema, created_by: str | None) -> ArmorSchema:
    armor_data = armor_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    armor_data["created_by"] = actor_id
    armor_data["created_at"] = now
    armor_data["updated_at"] = now

    meta = armor_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    armor_data["meta"] = meta

    try:
        result = _armors.insert_one(armor_data)
        created = _armors.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating armor: {exc}") from exc


def update_armor(armor_id: str, armor: ArmorSchema) -> ArmorSchema:
    if not ObjectId.is_valid(armor_id):
        raise HTTPException(status_code=400, detail="Invalid armor id")

    updates = armor.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _armors.update_one({"_id": ObjectId(armor_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Armor not found")

    updated = _armors.find_one({"_id": ObjectId(armor_id)})
    return _to_schema(updated)


def delete_armor(armor_id: str) -> dict:
    if not ObjectId.is_valid(armor_id):
        raise HTTPException(status_code=400, detail="Invalid armor id")

    result = _armors.delete_one({"_id": ObjectId(armor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Armor not found")

    return {"deleted": True, "armor_id": armor_id}
