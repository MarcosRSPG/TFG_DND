from typing import Any

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_characters = _db["characters"]


def _character_filter(character_id: str) -> dict[str, Any]:
    if ObjectId.is_valid(character_id):
        return {"$or": [{"_id": ObjectId(character_id)}, {"index": character_id}, {"name": character_id}]}
    return {"$or": [{"index": character_id}, {"name": character_id}]}


def get_local_docs() -> list[dict[str, Any]]:
    try:
        return list(_characters.find({}))
    except PyMongoError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Error retrieving characters: {exc}") from exc


def get_local_doc_by_id(character_id: str) -> dict[str, Any] | None:
    try:
        return _characters.find_one(_character_filter(character_id))
    except PyMongoError:
        return None


def save_local_character(character_data: dict) -> dict:
    try:
        result = _characters.insert_one(character_data)
        character_data["_id"] = result.inserted_id
        return character_data
    except PyMongoError:
        return {}


def update_local_character(character_id: str, character_data: dict) -> dict:
    try:
        result = _characters.update_one(_character_filter(character_id), {"$set": character_data})
        if result.matched_count > 0:
            return _characters.find_one(_character_filter(character_id)) or {}
        return {}
    except PyMongoError:
        return {}


def delete_local_character(character_id: str) -> bool:
    try:
        result = _characters.delete_one(_character_filter(character_id))
        return result.deleted_count > 0
    except PyMongoError:
        return False