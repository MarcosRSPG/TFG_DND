from services import weapons_service, armors_service, mounts_service, tools_service, adventuringGears_service
from services.equipment_repository import merge_docs
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import requests
from pydantic import ValidationError
from models.Weapon import WeaponSchema
from models.Armor import ArmorSchema
from models.Mount import MountSchema
from models.Tool import ToolSchema
from models.AdventuringGear import AdventuringGearSchema
from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_items = _db["items"]


def _schema_for_type(type: str | None):
    match type:
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
        case _:
            raise HTTPException(status_code=400, detail="Invalid item type")


def _coerce_item(type: str | None, item_data: dict):
    schema_class = _schema_for_type(type)
    return schema_class.model_validate(item_data)


def get_all():
    return merge_docs()


def get_by_type(type: str = None):
    try:
        match type:
            case "adventuringgear": return adventuringGears_service.get_all()
            case "armor": return armors_service.get_all()
            case "mount": return mounts_service.get_all()
            case "tool": return tools_service.get_all()
            case "weapon": return weapons_service.get_all()
            case _: raise HTTPException(status_code=400, detail="Invalid item type")
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving items from external API: {exc}") from exc

def get_by_id(item_id: str, type: str = None):
    try:
        match type:
            case "adventuringgear": doc = adventuringGears_service.get_by_id(item_id)
            case "armor": doc = armors_service.get_by_id(item_id)
            case "mount": doc = mounts_service.get_by_id(item_id)
            case "tool": doc = tools_service.get_by_id(item_id)
            case "weapon": doc = weapons_service.get_by_id(item_id)
            case _: raise HTTPException(status_code=400, detail="Invalid item type")
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving item from external API: {exc}") from exc
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return doc

def create(item_data: dict, type: str = None, created_by: str = None) -> dict:
    try:
        item_schema = _coerce_item(type, item_data)
        match type:
            case "adventuringgear": return adventuringGears_service.create_adventuringgear(item_schema, created_by)
            case "armor": return armors_service.create_armor(item_schema, created_by)
            case "mount": return mounts_service.create_mount(item_schema, created_by)
            case "tool": return tools_service.create_tool(item_schema, created_by)
            case "weapon": return weapons_service.create_weapon(item_schema, created_by)
            case _: raise HTTPException(status_code=400, detail="Invalid item type")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Error creating item from external API: {exc}") from exc

def update(item_id: str, item_data: dict, type: str = None) -> dict:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")
    try:
        item_schema = _coerce_item(type, item_data)
        match type:
            case "adventuringgear": return adventuringGears_service.update_adventuringgear(item_id, item_schema)
            case "armor": return armors_service.update_armor(item_id, item_schema)
            case "mount": return mounts_service.update_mount(item_id, item_schema)
            case "tool": return tools_service.update_tool(item_id, item_schema)
            case "weapon": return weapons_service.update_weapon(item_id, item_schema)
            case _: raise HTTPException(status_code=400, detail="Invalid item type")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Error updating item from external API: {exc}") from exc

def delete(item_id: str) -> dict:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")

    try:
        result = _items.delete_one({"_id": ObjectId(item_id)})
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error deleting item: {exc}") from exc

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"deleted": True, "item_id": item_id}
