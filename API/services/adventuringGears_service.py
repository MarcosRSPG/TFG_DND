from datetime import datetime, timezone

from models.AdventuringGear import AdventuringGearSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME
from services.equipment_repository import get_local_doc_by_id, get_remote_doc_by_id, merge_docs


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_adventuringgears = _db["items"]


def _to_schema(doc: dict) -> AdventuringGearSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return AdventuringGearSchema(**payload)


def get_all() -> list[AdventuringGearSchema]:
    docs = merge_docs("adventuring-gear")
    return [_to_schema(doc) for doc in docs]


def get_by_id(adventuringgear_id: str) -> AdventuringGearSchema:
    doc = get_local_doc_by_id(adventuringgear_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "adventuring-gear":
            raise HTTPException(status_code=404, detail="Adventuring Gear not found")
        return _to_schema(doc)

    adventuringgear_real = get_remote_doc_by_id(adventuringgear_id)
    if adventuringgear_real is None:
        raise HTTPException(status_code=404, detail="Adventuring Gear not found")
    if adventuringgear_real.get("equipment_category", {}).get("index") != "adventuring-gear":
        raise HTTPException(status_code=404, detail="Adventuring Gear not found")
    return AdventuringGearSchema(**adventuringgear_real)


def create(adventuringgear_schema: AdventuringGearSchema, created_by: str | None) -> AdventuringGearSchema:
    adventuringgear_data = adventuringgear_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    adventuringgear_data["created_by"] = actor_id
    adventuringgear_data["created_at"] = now
    adventuringgear_data["updated_at"] = now

    meta = adventuringgear_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    adventuringgear_data["meta"] = meta

    try:
        result = _adventuringgears.insert_one(adventuringgear_data)
        created = _adventuringgears.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating adventuring gear: {exc}") from exc


def update(adventuringgear_id: str, adventuringgear: AdventuringGearSchema) -> AdventuringGearSchema:
    if not ObjectId.is_valid(adventuringgear_id):
        raise HTTPException(status_code=400, detail="Invalid adventuring gear id")

    updates = adventuringgear.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _adventuringgears.update_one({"_id": ObjectId(adventuringgear_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Adventuring Gear not found")

    updated = _adventuringgears.find_one({"_id": ObjectId(adventuringgear_id)})
    return _to_schema(updated)


def get_all_adventuringgears() -> list[AdventuringGearSchema]:
    return get_all()


def get_adventuringgear_by_id(adventuringgear_id: str) -> AdventuringGearSchema:
    return get_by_id(adventuringgear_id)


def create_adventuringgear(adventuringgear_schema: AdventuringGearSchema, created_by: str | None) -> AdventuringGearSchema:
    return create(adventuringgear_schema, created_by)


def update_adventuringgear(adventuringgear_id: str, adventuringgear: AdventuringGearSchema) -> AdventuringGearSchema:
    return update(adventuringgear_id, adventuringgear)


def delete_adventuringgear(adventuringgear_id: str) -> dict:
    if not ObjectId.is_valid(adventuringgear_id):
        raise HTTPException(status_code=400, detail="Invalid adventuring gear id")

    result = _adventuringgears.delete_one({"_id": ObjectId(adventuringgear_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Adventuring Gear not found")

    return {"deleted": True, "adventuringgear_id": adventuringgear_id}