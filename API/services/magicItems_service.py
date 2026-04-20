from datetime import datetime, timezone
from models.MagicItem import MagicItemSchema
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE
from services.equipment_repository import get_local_doc_by_id, get_remote_doc_by_id, merge_docs

_client: AsyncIOMotorClient | None = None


async def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client[MONGODB_DATABASE]


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


async def get_all(page: int = 1, page_size: int = 20) -> list[MagicItemSchema]:
    docs = await merge_docs("magic-items", page=page, page_size=page_size)
    return [_to_schema(doc) for doc in docs]


async def get_by_id(magicItem_id: str) -> MagicItemSchema:
    doc = await get_local_doc_by_id(magicItem_id)
    if doc is not None:
        if not _is_magic_item(doc):
            raise HTTPException(status_code=404, detail="MagicItem not found")
        return _to_schema(doc)

    magicItem_real = await get_remote_doc_by_id(magicItem_id)
    if magicItem_real is None:
        raise HTTPException(status_code=404, detail="MagicItem not found")
    if not _is_magic_item(magicItem_real):
        raise HTTPException(status_code=404, detail="MagicItem not found")
    return MagicItemSchema(**magicItem_real)


async def create(magicItem_schema: MagicItemSchema, created_by: str | None) -> MagicItemSchema:
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

    db = await get_db()
    collection = db["items"]
    try:
        result = await collection.insert_one(magicItem_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating magicItem: {exc}") from exc


async def update(magicItem_id: str, magicItem: MagicItemSchema) -> MagicItemSchema:
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

    db = await get_db()
    collection = db["items"]
    result = await collection.update_one({"_id": ObjectId(magicItem_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="MagicItem not found")

    updated = await collection.find_one({"_id": ObjectId(magicItem_id)})
    return _to_schema(updated)


async def get_all_magicItems() -> list[MagicItemSchema]:
    return await get_all()


async def get_magicItem_by_id(magicItem_id: str) -> MagicItemSchema:
    return await get_by_id(magicItem_id)


async def create_magicItem(magicItem: MagicItemSchema, created_by: str | None) -> MagicItemSchema:
    return await create(magicItem, created_by)


async def update_magicItem(magicItem_id: str, magicItem: MagicItemSchema) -> MagicItemSchema:
    return await update(magicItem_id, magicItem)


async def delete_magicItem(magicItem_id: str) -> dict:
    if not ObjectId.is_valid(magicItem_id):
        raise HTTPException(status_code=400, detail="Invalid magicItem id")

    db = await get_db()
    collection = db["items"]
    result = await collection.delete_one({"_id": ObjectId(magicItem_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="MagicItem not found")

    return {"deleted": True, "magicItem_id": magicItem_id}