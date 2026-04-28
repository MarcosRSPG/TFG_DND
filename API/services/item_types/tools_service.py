from datetime import datetime, timezone
from typing import Any
from models.item_types.Tool import ToolSchema
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from config import MONGODB_COLLECTION_ITEMS
from pydantic import ValidationError


def _to_schema(doc: dict) -> ToolSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return ToolSchema(**payload)

async def get_local_docs() -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query = {"equipment_category.index": "tool"}
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving tools: {exc}") from exc

async def get_local_doc_by_id(tool_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(tool_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(tool_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": tool_id, "equipment_category.index": "tool"})

async def get_all() -> list[ToolSchema]:
    docs = await get_local_docs()
    return [_to_schema(doc) for doc in docs]

async def get_by_id(tool_id: str) -> ToolSchema:
    doc = await get_local_doc_by_id(tool_id)
    if doc is not None:
        if doc.get("equipment_category", {}).get("index") != "tool":
            raise HTTPException(status_code=404, detail="Tool not found")
        return _to_schema(doc)
    
    raise HTTPException(status_code=404, detail="Tool not found")

async def create(tool_schema: ToolSchema, created_by: str | None) -> ToolSchema:
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
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    try:
        result = await collection.insert_one(tool_data)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating tool: {exc}") from exc

async def update(tool_id: str, tool: ToolSchema) -> ToolSchema:
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
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.update_one({"_id": ObjectId(tool_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    updated = await collection.find_one({"_id": ObjectId(tool_id)})
    return _to_schema(updated)

async def get_all_tools() -> list[ToolSchema]:
    return await get_all()

async def get_tool_by_id(tool_id: str) -> ToolSchema:
    return await get_by_id(tool_id)

async def create_tool(tool: ToolSchema, created_by: str | None) -> ToolSchema:
    return await create(tool, created_by)

async def update_tool(tool_id: str, tool: ToolSchema) -> ToolSchema:
    return await update(tool_id, tool)

async def delete_tool(tool_id: str) -> dict:
    return await delete(tool_id)

async def delete(tool_id: str) -> dict:
    if not ObjectId.is_valid(tool_id):
        raise HTTPException(status_code=400, detail="Invalid tool id")
    
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    result = await collection.delete_one({"_id": ObjectId(tool_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    return {"deleted": True, "tool_id": tool_id}
