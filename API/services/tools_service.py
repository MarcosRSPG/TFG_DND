from datetime import datetime, timezone

from models.Tool import ToolSchema
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME
from services.equipment_repository import get_local_doc_by_id, get_remote_doc_by_id, merge_docs


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_tools = _db["items"]


def _to_schema(doc: dict) -> ToolSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return ToolSchema(**payload)


def get_all() -> list[ToolSchema]:
    docs = merge_docs("tool")
    return [_to_schema(doc) for doc in docs]


def get_by_id(tool_id: str) -> ToolSchema:
    doc = get_local_doc_by_id(tool_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "tool":
            raise HTTPException(status_code=404, detail="Tool not found")
        return _to_schema(doc)

    tool_real = get_remote_doc_by_id(tool_id)
    if tool_real is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    if tool_real.get("equipment_category", {}).get("index") != "tool":
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolSchema(**tool_real)


def create(tool_schema: ToolSchema, created_by: str | None) -> ToolSchema:
    tool_data = tool_schema.model_dump(exclude_none=True)
    actor_id = created_by or "api"
    now = datetime.now(timezone.utc).isoformat()

    tool_data["created_by"] = actor_id
    tool_data["created_at"] = now
    tool_data["updated_at"] = now

    meta = tool_data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    meta["created_by"] = actor_id
    meta["created_at"] = now
    meta["updated_at"] = now
    tool_data["meta"] = meta

    try:
        result = _tools.insert_one(tool_data)
        created = _tools.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating tool: {exc}") from exc


def update(tool_id: str, tool: ToolSchema) -> ToolSchema:
    if not ObjectId.is_valid(tool_id):
        raise HTTPException(status_code=400, detail="Invalid tool id")

    updates = tool.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at", "updated_at"})
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    meta = updates.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = now
    updates["meta"] = meta

    result = _tools.update_one({"_id": ObjectId(tool_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tool not found")

    updated = _tools.find_one({"_id": ObjectId(tool_id)})
    return _to_schema(updated)


def get_all_tools() -> list[ToolSchema]:
    return get_all()


def get_tool_by_id(tool_id: str) -> ToolSchema:
    return get_by_id(tool_id)


def create_tool(tool: ToolSchema, created_by: str | None) -> ToolSchema:
    return create(tool, created_by)


def update_tool(tool_id: str, tool: ToolSchema) -> ToolSchema:
    return update(tool_id, tool)


def delete_tool(tool_id: str) -> dict:
    if not ObjectId.is_valid(tool_id):
        raise HTTPException(status_code=400, detail="Invalid tool id")

    result = _tools.delete_one({"_id": ObjectId(tool_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tool not found")

    return {"deleted": True, "tool_id": tool_id}
