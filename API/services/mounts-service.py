from datetime import datetime, timezone

from models.Mount import MountSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import requests


from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME, API_DND5E

MONGODB_URI = F"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_mounts = _db["items"]


def _to_schema(doc: dict) -> MountSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return MountSchema(**payload)


def get_all_mounts() -> list[MountSchema]:
    try:
        docs = list(_mounts.find({'equipment_category.index': 'mount'}))
        try:
            mounts_originales = requests.get(API_DND5E + "mounts").json().get("results", [])
            for mount in mounts_originales:
                mount_real = requests.get(API_DND5E + f"mounts/{mount['index']}").json()
                docs.append({**mount_real, "_id": mount_real.get("index")})
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving mounts from external API: {exc}") from exc
        return [_to_schema(doc) for doc in docs]
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving mounts: {exc}") from exc


def get_mount_by_id(mount_id: str) -> MountSchema:
    if not ObjectId.is_valid(mount_id):
        raise HTTPException(status_code=400, detail="Invalid mount id")

    doc = _mounts.find_one({"_id": ObjectId(mount_id)})
    if not doc:
        # Try to find in external API
        try:
            mount_real = requests.get(API_DND5E + f"mounts/{mount_id}").json()
            if mount_real.get("error"):
                raise HTTPException(status_code=404, detail="Mount not found")
            return MountSchema(**mount_real)
        except requests.RequestException as exc:
            raise HTTPException(status_code=500, detail=f"Error retrieving mount from external API: {exc}") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Mount not found")
    return _to_schema(doc)


def create_mount(mount_schema: MountSchema, created_by: str | None) -> MountSchema:
    mount_data = mount_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    mount_data["created_by"] = actor_id
    mount_data["created_at"] = now
    mount_data["updated_at"] = now

    meta = mount_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    mount_data["meta"] = meta

    try:
        result = _mounts.insert_one(mount_data)
        created = _mounts.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating mount: {exc}") from exc


def update_mount(mount_id: str, mount: MountSchema) -> MountSchema:
    if not ObjectId.is_valid(mount_id):
        raise HTTPException(status_code=400, detail="Invalid mount id")

    updates = mount.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _mounts.update_one({"_id": ObjectId(mount_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mount not found")

    updated = _mounts.find_one({"_id": ObjectId(mount_id)})
    return _to_schema(updated)


def delete_mount(mount_id: str) -> dict:
    if not ObjectId.is_valid(mount_id):
        raise HTTPException(status_code=400, detail="Invalid mount id")

    result = _mounts.delete_one({"_id": ObjectId(mount_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mount not found")

    return {"deleted": True, "mount_id": mount_id}
