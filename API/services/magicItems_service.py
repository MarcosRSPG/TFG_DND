from datetime import datetime, timezone

from models.MagicItem import MagicItemSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME
from services.equipment_repository import get_local_doc_by_id, get_remote_doc_by_id, merge_docs


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_magicItems = _db["items"]


def _is_magic_item(doc: dict) -> bool:
    rarity = doc.get("rarity")
    if isinstance(rarity, dict) and rarity.get("name"):
        return True

    if isinstance(doc.get("variant"), bool):
        return True

    if isinstance(doc.get("url"), str) and "/magic-items/" in doc.get("url", ""):
        return True

    return doc.get("equipment_category", {}).get("index") == "magic-items"


def _to_schema(doc: dict) -> MagicItemSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return MagicItemSchema(**payload)


def get_all() -> list[MagicItemSchema]:
    docs = merge_docs("magic-items")
    return [_to_schema(doc) for doc in docs]


def get_by_id(magicItem_id: str) -> MagicItemSchema:
    doc = get_local_doc_by_id(magicItem_id)
    if doc is not None:
        if not _is_magic_item(doc):
            raise HTTPException(status_code=404, detail="MagicItem not found")
        return _to_schema(doc)

    magicItem_real = get_remote_doc_by_id(magicItem_id)
    if magicItem_real is None:
        raise HTTPException(status_code=404, detail="MagicItem not found")
    if not _is_magic_item(magicItem_real):
        raise HTTPException(status_code=404, detail="MagicItem not found")
    return MagicItemSchema(**magicItem_real)


def create(magicItem_schema: MagicItemSchema, created_by: str | None) -> MagicItemSchema:
    magicItem_data = magicItem_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    magicItem_data["created_by"] = actor_id
    magicItem_data["created_at"] = now
    magicItem_data["updated_at"] = now

    meta = magicItem_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    magicItem_data["meta"] = meta

    try:
        result = _magicItems.insert_one(magicItem_data)
        created = _magicItems.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating magicItem: {exc}") from exc


def update(magicItem_id: str, magicItem: MagicItemSchema) -> MagicItemSchema:
    if not ObjectId.is_valid(magicItem_id):
        raise HTTPException(status_code=400, detail="Invalid magicItem id")

    updates = magicItem.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _magicItems.update_one({"_id": ObjectId(magicItem_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="MagicItem not found")

    updated = _magicItems.find_one({"_id": ObjectId(magicItem_id)})
    return _to_schema(updated)


def get_all_magicItems() -> list[MagicItemSchema]:
    return get_all()


def get_magicItem_by_id(magicItem_id: str) -> MagicItemSchema:
    return get_by_id(magicItem_id)


def create_magicItem(magicItem: MagicItemSchema, created_by: str | None) -> MagicItemSchema:
    return create(magicItem, created_by)


def update_magicItem(magicItem_id: str, magicItem: MagicItemSchema) -> MagicItemSchema:
    return update(magicItem_id, magicItem)


def delete_magicItem(magicItem_id: str) -> dict:
    if not ObjectId.is_valid(magicItem_id):
        raise HTTPException(status_code=400, detail="Invalid magicItem id")

    result = _magicItems.delete_one({"_id": ObjectId(magicItem_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="MagicItem not found")

    return {"deleted": True, "magicItem_id": magicItem_id}
