from datetime import datetime, timezone
from models.Mount import MountSchema
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


def _is_mount_doc(doc: dict) -> bool:
    return doc.get("equipment_category", {}).get("index") == "mounts-and-vehicles"


def _to_schema(doc: dict) -> MountSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return MountSchema(**payload)


async def get_all(page: int = 1, page_size: int = 20) -> list[MountSchema]:
    docs = await merge_docs("mounts-and-vehicles", page=page, page_size=page_size)
    seen_ids = set()
    valid_mounts = []
    for doc in docs:
        if not _is_mount_doc(doc):
            continue
        doc_id = str(doc.get("index") or doc.get("id") or doc.get("_id"))
        if not doc_id or doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)
        valid_mounts.append(_to_schema(doc))
    return valid_mounts


async def get_by_id(mount_id: str) -> MountSchema:
    doc = await get_local_doc_by_id(mount_id)
    if doc is not None:
        if not _is_mount_doc(doc):
            raise HTTPException(status_code=404, detail="Mount not found")
        return _to_schema(doc)

    mount_real = await get_remote_doc_by_id(mount_id)
    if mount_real is None:
        raise HTTPException(status_code=404, detail="Mount not found")
    if not _is_mount_doc(mount_real):
        raise HTTPException(status_code=404, detail="Mount not found")
    return MountSchema(**mount_real)


async def create(mount_schema: MountSchema, created_by: str | None) -> MountSchema:
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

    db = await get_db()
    collection = db["items"]
    try:
        result = await collection.insert_one(mount_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating mount: {exc}") from exc


async def update(mount_id: str, mount: MountSchema) -> MountSchema:
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

    db = await get_db()
    collection = db["items"]
    result = await collection.update_one({"_id": ObjectId(mount_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mount not found")

    updated = await collection.find_one({"_id": ObjectId(mount_id)})
    return _to_schema(updated)


async def get_all_mounts() -> list[MountSchema]:
    return await get_all()


async def get_mount_by_id(mount_id: str) -> MountSchema:
    return await get_by_id(mount_id)


async def create_mount(mount: MountSchema, created_by: str | None) -> MountSchema:
    return await create(mount, created_by)


async def update_mount(mount_id: str, mount: MountSchema) -> MountSchema:
    return await update(mount_id, mount)


async def delete_mount(mount_id: str) -> dict:
    if not ObjectId.is_valid(mount_id):
        raise HTTPException(status_code=400, detail="Invalid mount id")

    db = await get_db()
    collection = db["items"]
    result = await collection.delete_one({"_id": ObjectId(mount_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mount not found")

    return {"deleted": True, "mount_id": mount_id}