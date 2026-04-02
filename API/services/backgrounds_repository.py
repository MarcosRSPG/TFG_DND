from typing import Any

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import API_DND5E, MONGODB_COLLECTION_BACKGROUNDS, MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME
from services.remote_catalog_repository import RemoteCatalogRepository


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_backgrounds = _db[MONGODB_COLLECTION_BACKGROUNDS]
_remote_backgrounds = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="backgrounds")


def _doc_key(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


def clear_remote_cache() -> None:
    _remote_backgrounds.clear_cache()


def get_local_docs() -> list[dict[str, Any]]:
    try:
        return list(_backgrounds.find({}))
    except PyMongoError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Error retrieving backgrounds: {exc}") from exc


def get_remote_docs() -> list[dict[str, Any]]:
    return list(_remote_backgrounds.get_catalog())


def merge_docs() -> list[dict[str, Any]]:
    local_docs = get_local_docs()
    local_keys = {_doc_key(doc) for doc in local_docs}
    merged_docs = list(local_docs)
    for doc in get_remote_docs():
        if _doc_key(doc) in local_keys:
            continue
        merged_docs.append({**doc, "_id": doc.get("index")})
    return merged_docs


def get_local_doc_by_id(background_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(background_id):
        return None
    return _backgrounds.find_one({"_id": ObjectId(background_id)})


def get_remote_doc_by_id(background_id: str) -> dict[str, Any] | None:
    return _remote_backgrounds.get_by_index(background_id)
