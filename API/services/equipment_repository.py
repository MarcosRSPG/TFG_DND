from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests
from bson import ObjectId
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import API_DND5E, MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_items = _db["items"]


_CATEGORY_ALIASES = {
    "adventuringgear": "adventuring-gear",
    "adventuring-gear": "adventuring-gear",
    "armor": "armor",
    "mount": "mount",
    "tool": "tool",
    "weapon": "weapon",
}


def normalize_category(category: str | None) -> str | None:
    if category is None:
        return None
    return _CATEGORY_ALIASES.get(category, category)


def _doc_key(doc: dict[str, Any]) -> str:
    return str(doc.get("index") or doc.get("id") or doc.get("_id"))


def _fetch_remote_detail(index: str) -> dict[str, Any] | None:
    try:
        detail = requests.get(API_DND5E + f"equipment/{index}", timeout=30).json()
        if detail.get("error"):
            return None
        return detail
    except requests.RequestException:
        return None


@lru_cache(maxsize=1)
def get_remote_catalog() -> tuple[dict[str, Any], ...]:
    try:
        summaries = requests.get(API_DND5E + "equipment", timeout=30).json().get("results", [])
        indexes = [summary.get("index") for summary in summaries if summary.get("index")]
        docs: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = [executor.submit(_fetch_remote_detail, index) for index in indexes]
            for future in as_completed(futures):
                detail = future.result()
                if detail is not None:
                    docs.append(detail)
        return tuple(docs)
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving equipment from external API: {exc}") from exc


def clear_remote_cache() -> None:
    get_remote_catalog.cache_clear()


def get_local_docs(category: str | None = None) -> list[dict[str, Any]]:
    try:
        query: dict[str, Any] = {}
        normalized_category = normalize_category(category)
        if normalized_category:
            query["equipment_category.index"] = normalized_category
        return list(_items.find(query))
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving items: {exc}") from exc


def get_remote_docs(category: str | None = None) -> list[dict[str, Any]]:
    normalized_category = normalize_category(category)
    docs = list(get_remote_catalog())
    if normalized_category is None:
        return docs
    return [doc for doc in docs if doc.get("equipment_category", {}).get("index") == normalized_category]


def merge_docs(category: str | None = None) -> list[dict[str, Any]]:
    local_docs = get_local_docs(category)
    local_keys = {_doc_key(doc) for doc in local_docs}
    merged_docs = list(local_docs)
    for doc in get_remote_docs(category):
        if _doc_key(doc) in local_keys:
            continue
        merged_docs.append({**doc, "_id": doc.get("index")})
    return merged_docs


def get_local_doc_by_id(item_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(item_id):
        return None
    return _items.find_one({"_id": ObjectId(item_id)})


def get_remote_doc_by_id(item_id: str) -> dict[str, Any] | None:
    for doc in get_remote_catalog():
        if doc.get("index") == item_id:
            return doc
    return None
