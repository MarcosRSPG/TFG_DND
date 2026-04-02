from datetime import datetime, timezone

from models.Background import BackgroundSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import requests


from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME, API_DND5E

MONGODB_URI = F"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_backgrounds = _db["backgrounds"]


def _to_schema(doc: dict) -> BackgroundSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return BackgroundSchema(**payload)


def get_all() -> list[BackgroundSchema]:
    try:
        docs = list(_backgrounds.find({}))
        try:
            backgrounds_originales = requests.get(API_DND5E + "backgrounds").json().get("results", [])
            for background in backgrounds_originales:
                background_real = requests.get(API_DND5E + f"backgrounds/{background['index']}").json()
                docs.append({**background_real, "_id": background_real.get("index")})
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds from external API: {exc}") from exc
        return [_to_schema(doc) for doc in docs]
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds: {exc}") from exc


def get_by_id(background_id: str) -> BackgroundSchema:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    doc = _backgrounds.find_one({"_id": ObjectId(background_id)})
    if not doc:
        # Try to find in external API
        try:
            background_real = requests.get(API_DND5E + f"backgrounds/{background_id}").json()
            if background_real.get("error"):
                raise HTTPException(status_code=404, detail="Background not found")
            return BackgroundSchema(**background_real)
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving background from external API: {exc}") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Background not found")
    return _to_schema(doc)


def create(background_schema: BackgroundSchema, created_by: str | None) -> BackgroundSchema:
    background_data = background_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    background_data["created_by"] = actor_id
    background_data["created_at"] = now
    background_data["updated_at"] = now

    meta = background_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    background_data["meta"] = meta

    try:
        result = _backgrounds.insert_one(background_data)
        created = _backgrounds.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating background: {exc}") from exc


def update(background_id: str, background: BackgroundSchema) -> BackgroundSchema:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    updates = background.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _backgrounds.update_one({"_id": ObjectId(background_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")

    updated = _backgrounds.find_one({"_id": ObjectId(background_id)})
    return _to_schema(updated)


def delete(background_id: str) -> dict:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    result = _backgrounds.delete_one({"_id": ObjectId(background_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")

    return {"deleted": True, "background_id": background_id}
