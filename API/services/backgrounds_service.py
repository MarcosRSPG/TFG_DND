from datetime import datetime, timezone

import bcrypt
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


def get_all_backgrounds() -> list[BackgroundSchema]:
    try:
        docs = list(_backgrounds.find({}))
        try:
            backgrounds_originales = requests.get(API_DND5E + "backgrounds").json().get("results", [])
            for background in backgrounds_originales:
                background_real = requests.get(API_DND5E + f"backgrounds/{background['index']}").json()
                docs.append({**background_real, "_id": background_real.get("index")})
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds from external API: {exc}") from exc
        return [BackgroundSchema(**doc) for doc in docs]
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds: {exc}") from exc


def get_background_by_id(background_id: str) -> BackgroundSchema:
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
    return BackgroundSchema(**doc)


def create_background(background_schema: BackgroundSchema, created_by: str) -> BackgroundSchema:
    background_data = background_schema.model_dump(exclude_none=True)
    background_data["meta"]["created_by"] = created_by
    background_data["meta"]["created_at"] = datetime.now(timezone.utc).isoformat()
    background_data["meta"]["updated_at"] = background_data["meta"]["created_at"]
    try:
        result = _backgrounds.insert_one(background_data)
        created = _backgrounds.find_one({"_id": result.inserted_id})
        return BackgroundSchema(**created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating background: {exc}") from exc


def update_background(background_id: str, background: BackgroundSchema) -> BackgroundSchema:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    updates = background.model_dump(exclude_none=True, exclude={"_id", "meta.created_by", "meta.created_at"})

    updates["meta"]["updated_at"] = datetime.now(timezone.utc).isoformat()

    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    result = _backgrounds.update_one({"_id": ObjectId(background_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")

    updated = _backgrounds.find_one({"_id": ObjectId(background_id)})
    return BackgroundSchema(**updated)


def delete_background(background_id: str) -> dict:
    if not ObjectId.is_valid(background_id):
        raise HTTPException(status_code=400, detail="Invalid background id")

    result = _backgrounds.delete_one({"_id": ObjectId(background_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")

    return {"deleted": True, "background_id": background_id}
