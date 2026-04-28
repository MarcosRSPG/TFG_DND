from typing import Any
from bson import ObjectId
from fastapi import HTTPException
from pydantic import ValidationError
from db import get_db
from config import MONGODB_COLLECTION_ITEMS
from models.item_types.MagicItem import MagicItemSchema
from models.item_types.Weapon import WeaponSchema
from models.item_types.Armor import ArmorSchema
from models.item_types.Mount import MountSchema
from models.item_types.Tool import ToolSchema
from models.item_types.AdventuringGear import AdventuringGearSchema

# Import individual item services
from services.item_types import weapons_service, armors_service, mounts_service, tools_service, adventuringGears_service, magicItems_service

# Category aliases from equipment_repository
_CATEGORY_ALIASES = {
    "adventuringgear": "adventuring-gear",
    "adventuring-gear": "adventuring-gear",
    "armor": "armor",
    "mount": "mount",
    "mounts-and-vehicles": "mounts-and-vehicles",
    "tool": "tool",
    "weapon": "weapon",
    "magicItem": "magic-items",
    "magic-item": "magic-items",
    "magic-items": "magic-items",
}

def normalize_category(category: str | None) -> str | None:
    if category is None:
        return None
    return _CATEGORY_ALIASES.get(category, category)

def _doc_key(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))

# Now uses only local MongoDB instead of remote API
async def get_remote_catalog() -> list[dict[str, Any]]:
    # Just get all items - filtering by category is done in get_local_docs
    return await get_local_docs()

async def clear_remote_cache() -> None:
    # No cache to clear anymore - we use MongoDB directly
    pass

async def get_local_docs(category: str | None = None) -> list[dict[str, Any]]:
    try:
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        query: dict[str, Any] = {}
        normalized_category = normalize_category(category)
        if normalized_category:
            if normalized_category == "magic-items":
                query["rarity.name"] = {"$exists": True}
            else:
                query["equipment_category.index"] = normalized_category
        return await collection.find(query).to_list(length=None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving items: {exc}") from exc

# Now just returns local
async def get_remote_docs(category: str | None = None) -> list[dict[str, Any]]:
    return await get_local_docs(category)

# Returns only local docs (no merging with remote)
async def get_all_docs(category: str | None = None) -> list[dict[str, Any]]:
    return await get_local_docs(category)

async def get_local_doc_by_id(item_id: str) -> dict[str, Any] | None:
    # Try as ObjectId first
    if ObjectId.is_valid(item_id):
        db = await get_db()
        collection = db[MONGODB_COLLECTION_ITEMS]
        doc = await collection.find_one({"_id": ObjectId(item_id)})
        if doc:
            return doc
    
    # Try as index
    db = await get_db()
    collection = db[MONGODB_COLLECTION_ITEMS]
    return await collection.find_one({"index": item_id})

# Now just returns local
async def get_remote_doc_by_id(item_id: str) -> dict[str, Any] | None:
    return await get_local_doc_by_id(item_id)

def _normalize_type(type_value: str | None) -> str | None:
    if type_value is None:
        return None
    
    normalized = type_value.strip().lower()
    aliases = {
        "adventuring-gear": "adventuringgear",
        "adventuringgear": "adventuringgear",
        "armor": "armor",
        "mount": "mount",
        "mounts": "mount",
        "tool": "tool",
        "tools": "tool",
        "weapon": "weapon",
        "weapons": "weapon",
        "magicitem": "magicitem",
        "magic-item": "magicitem",
        "magic-items": "magicitem",
        "magicitems": "magicitem",
    }
    
    return aliases.get(normalized, normalized)

def _json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value

def _is_magic_item_doc(item_data: dict) -> bool:
    rarity = item_data.get("rarity")
    if isinstance(rarity, dict) and rarity.get("name"):
        return True
    
    if isinstance(item_data.get("variant"), bool):
        return True
    
    if isinstance(item_data.get("url"), str) and "/magic-items/" in item_data.get("url", ""):
        return True
    
    return item_data.get("equipment_category", {}).get("index") == "magic-items"

def _schema_for_doc(item_data: dict):
    category = item_data.get("equipment_category", {}).get("index")
    
    if _is_magic_item_doc(item_data):
        return MagicItemSchema
    if category == "weapon":
        return WeaponSchema
    if category == "armor":
        return ArmorSchema
    if category == "mounts-and-vehicles":
        if "speed" in item_data and "capacity" in item_data and "vehicle_category" in item_data:
            return MountSchema
        return None
    if category == "tool":
        return ToolSchema
    if category == "adventuring-gear":
        return AdventuringGearSchema
    
    return None

def _format_item_doc(item_data: dict) -> dict:
    payload = dict(item_data)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    
    schema_class = _schema_for_doc(payload)
    if schema_class is None:
        return _json_safe(payload)
    
    try:
        return schema_class.model_validate(payload).model_dump(exclude_none=True)
    except ValidationError:
        return _json_safe(payload)

def _schema_for_type(type: str | None):
    normalized_type = _normalize_type(type)
    
    match normalized_type:
        case "adventuringgear":
            return AdventuringGearSchema
        case "armor":
            return ArmorSchema
        case "mount":
            return MountSchema
        case "tool":
            return ToolSchema
        case "weapon":
            return WeaponSchema
        case "magicitem":
            return MagicItemSchema
        case _:
            raise HTTPException(status_code=400, detail="Invalid item type")

def _coerce_item(type: str | None, item_data: dict):
    schema_class = _schema_for_type(type)
    return schema_class.model_validate(item_data)

async def get_all():
    return [_format_item_doc(doc) for doc in await get_all_docs()]

async def get_by_type(type: str = None):
    normalized_type = _normalize_type(type)
    
    try:
        match normalized_type:
            case "adventuringgear":
                return await adventuringGears_service.get_all()
            case "armor":
                return await armors_service.get_all()
            case "mount":
                return await mounts_service.get_all()
            case "tool":
                return await tools_service.get_all()
            case "weapon":
                return await weapons_service.get_all()
            case "magicitem":
                return await magicItems_service.get_all()
            case _:
                raise HTTPException(status_code=400, detail="Invalid item type")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving items: {exc}") from exc

async def get_by_id(item_id: str, type: str = None):
    normalized_type = _normalize_type(type)
    
    try:
        match normalized_type:
            case "adventuringgear":
                doc = await adventuringGears_service.get_by_id(item_id)
            case "armor":
                doc = await armors_service.get_by_id(item_id)
            case "mount":
                doc = await mounts_service.get_by_id(item_id)
            case "tool":
                doc = await tools_service.get_by_id(item_id)
            case "weapon":
                doc = await weapons_service.get_by_id(item_id)
            case "magicitem":
                doc = await magicItems_service.get_by_id(item_id)
            case _:
                raise HTTPException(status_code=400, detail="Invalid item type")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving item: {exc}") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return doc

async def create(item_data: dict, type: str = None, created_by: str = None) -> dict:
    normalized_type = _normalize_type(type)
    
    try:
        item_schema = _coerce_item(normalized_type, item_data)
        match normalized_type:
            case "adventuringgear":
                return await adventuringGears_service.create(item_schema, created_by)
            case "armor":
                return await armors_service.create(item_schema, created_by)
            case "mount":
                return await mounts_service.create(item_schema, created_by)
            case "tool":
                return await tools_service.create(item_schema, created_by)
            case "weapon":
                return await weapons_service.create(item_schema, created_by)
            case "magicitem":
                return await magicItems_service.create(item_schema, created_by)
            case _:
                raise HTTPException(status_code=400, detail="Invalid item type")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating item: {exc}") from exc

async def update(item_id: str, item_data: dict, type: str = None) -> dict:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")
    
    normalized_type = _normalize_type(type)
    
    try:
        item_schema = _coerce_item(normalized_type, item_data)
        match normalized_type:
            case "adventuringgear":
                return await adventuringGears_service.update(item_id, item_schema)
            case "armor":
                return await armors_service.update(item_id, item_schema)
            case "mount":
                return await mounts_service.update(item_id, item_schema)
            case "tool":
                return await tools_service.update(item_id, item_schema)
            case "weapon":
                return await weapons_service.update(item_id, item_schema)
            case "magicitem":
                return await magicItems_service.update(item_id, item_schema)
            case _:
                raise HTTPException(status_code=400, detail="Invalid item type")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error updating item: {exc}") from exc

async def delete(item_id: str) -> dict:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")
    
    db = await get_db()
    collection = db["items"]
    try:
        result = await collection.delete_one({"_id": ObjectId(item_id)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error deleting item: {exc}") from exc
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"deleted": True, "item_id": item_id}
