from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from pydantic import ValidationError
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import API_DND5E, MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME
from models.Character import (
    ApiReferenceSchema,
    CharacterSchema,
)
from services.backgrounds_repository import get_remote_doc_by_id as get_remote_background_by_id
from services.characters_repository import (
    delete_local_character,
    get_local_doc_by_id,
    get_local_docs,
    save_local_character,
    update_local_character,
)
from services.remote_catalog_repository import RemoteCatalogRepository


MONGODB_URI = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_items = _db["items"]

_remote_classes = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="classes")
_remote_subclasses = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="subclasses")
_remote_races = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="races")
_remote_subraces = RemoteCatalogRepository(base_url=API_DND5E, list_endpoint="subraces")


def _json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _slugify(value: str) -> str:
    slug = value.strip().lower()
    pieces = []
    previous_dash = False
    for character in slug:
        if character.isalnum():
            pieces.append(character)
            previous_dash = False
        elif not previous_dash:
            pieces.append("-")
            previous_dash = True
    result = "".join(pieces).strip("-")
    return result or slug.replace(" ", "-")


def _to_schema(doc: dict) -> CharacterSchema:
    payload = dict(doc)
    mongo_id = payload.pop("_id", None)
    if mongo_id is not None and not payload.get("id"):
        payload["id"] = str(mongo_id)
    return CharacterSchema.model_validate(payload)


def _resolve_reference(reference_data: Any, repository: RemoteCatalogRepository | None = None) -> dict:
    if reference_data is None:
        raise HTTPException(status_code=422, detail="Missing reference data")

    if hasattr(reference_data, "model_dump"):
        payload = reference_data.model_dump(exclude_none=True)
    else:
        payload = dict(reference_data)

    index = payload.get("index")
    url = payload.get("url")
    if not index:
        raise HTTPException(status_code=422, detail="Reference index is required")

    if repository is not None:
        remote_doc = repository.get_by_index(index)
        if remote_doc is not None:
            return {
                "index": remote_doc.get("index", index),
                "name": remote_doc.get("name", payload.get("name")),
                "url": remote_doc.get("url", url),
            }

    return {
        "index": index,
        "name": payload.get("name"),
        "url": url,
    }


def _resolve_background(reference_data: Any) -> dict:
    if reference_data is None:
        raise HTTPException(status_code=422, detail="Missing background reference")

    if hasattr(reference_data, "model_dump"):
        payload = reference_data.model_dump(exclude_none=True)
    else:
        payload = dict(reference_data)

    index = payload.get("index")
    url = payload.get("url")
    if not index:
        raise HTTPException(status_code=422, detail="Background index is required")

    remote_doc = get_remote_background_by_id(index)
    if remote_doc is not None:
        return {
            "index": remote_doc.get("index", index),
            "name": remote_doc.get("name", payload.get("name")),
            "url": remote_doc.get("url", url),
        }

    return {
        "index": index,
        "name": payload.get("name"),
        "url": url,
    }


def _existing_item_refs(item_refs: list[str]) -> list[str]:
    if not item_refs:
        return []

    unique_refs = list(dict.fromkeys(ref for ref in item_refs if ref))
    object_ids = [ObjectId(ref) for ref in unique_refs if ObjectId.is_valid(ref)]
    loose_refs = [ref for ref in unique_refs if not ObjectId.is_valid(ref)]

    query_parts: list[dict[str, Any]] = []
    if object_ids:
        query_parts.append({"_id": {"$in": object_ids}})
    if loose_refs:
        query_parts.append({"index": {"$in": loose_refs}})
        query_parts.append({"url": {"$in": loose_refs}})

    if not query_parts:
        return []

    docs = list(_items.find({"$or": query_parts}, {"_id": 1, "index": 1, "url": 1}))
    valid_refs = set()
    for doc in docs:
        if doc.get("_id") is not None:
            valid_refs.add(str(doc["_id"]))
        if doc.get("index"):
            valid_refs.add(doc["index"])
        if doc.get("url"):
            valid_refs.add(doc["url"])

    return [ref for ref in unique_refs if ref in valid_refs]


def _normalize_character_payload(character_data: dict, *, created_by: str | None = None, strict_items: bool = False) -> dict:
    payload = dict(character_data)

    for managed_field in ("id", "created_by", "created_at", "updated_at"):
        payload.pop(managed_field, None)

    if not payload.get("index"):
        payload["index"] = _slugify(payload.get("name", ""))

    if created_by:
        payload["player"] = created_by

    payload["class"] = _resolve_reference(payload.get("class"), _remote_classes)
    if payload.get("subclass") is not None:
        payload["subclass"] = _resolve_reference(payload.get("subclass"), _remote_subclasses)
    payload["race"] = _resolve_reference(payload.get("race"), _remote_races)
    if payload.get("subrace") is not None:
        payload["subrace"] = _resolve_reference(payload.get("subrace"), _remote_subraces)
    payload["background"] = _resolve_background(payload.get("background"))

    inventory = payload.get("inventory") or {}
    if hasattr(inventory, "model_dump"):
        inventory = inventory.model_dump(exclude_none=True)
    else:
        inventory = dict(inventory)

    item_refs = inventory.get("items") or []
    if not isinstance(item_refs, list):
        raise HTTPException(status_code=422, detail="inventory.items must be a list")

    existing_refs = _existing_item_refs(item_refs)
    if strict_items:
        missing_refs = [ref for ref in item_refs if ref not in existing_refs]
        if missing_refs:
            raise HTTPException(status_code=422, detail={"missing_item_refs": missing_refs})

    inventory["items"] = existing_refs if strict_items else existing_refs
    payload["inventory"] = inventory

    character = CharacterSchema.model_validate(payload)
    return character.model_dump(exclude_none=True, by_alias=True)


def _format_character_doc(doc: dict) -> dict:
    try:
        payload = _normalize_character_payload(doc, strict_items=False)
        return payload
    except ValidationError:
        return _json_safe(doc)


def get_all() -> list[dict]:
    docs = get_local_docs()
    return [_format_character_doc(doc) for doc in docs]


def get_by_id(character_id: str) -> dict:
    doc = get_local_doc_by_id(character_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return _format_character_doc(doc)


def create(character: dict, created_by: str | None) -> dict:
    if not created_by:
        raise HTTPException(status_code=401, detail="Unauthorized user")

    try:
        now = datetime.now(timezone.utc).isoformat()
        character_data = _normalize_character_payload(character, created_by=created_by, strict_items=True)
        character_data["created_by"] = created_by or character_data.get("created_by") or "api"
        character_data["created_at"] = now
        character_data["updated_at"] = now

        meta = character_data.get("_meta")
        if not isinstance(meta, dict):
            meta = {}
        meta["created_by"] = character_data["created_by"]
        meta["created_at"] = now
        meta["updated_at"] = now
        character_data["_meta"] = meta

        result = save_local_character(character_data)
        return _format_character_doc(result)
    except HTTPException:
        raise
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating character: {exc}") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def update(character_id: str, character: dict, updated_by: str | None) -> dict:
    if not updated_by:
        raise HTTPException(status_code=401, detail="Unauthorized user")

    if not ObjectId.is_valid(character_id) and not get_local_doc_by_id(character_id):
        raise HTTPException(status_code=400, detail="Invalid character id")

    try:
        character_data = _normalize_character_payload(character, created_by=updated_by, strict_items=True)
        character_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        meta = character_data.get("_meta")
        if not isinstance(meta, dict):
            meta = {}
        meta["updated_at"] = character_data["updated_at"]
        character_data["_meta"] = meta

        result = update_local_character(character_id, character_data)
        if not result:
            raise HTTPException(status_code=404, detail="Character not found")
        return _format_character_doc(result)
    except HTTPException:
        raise
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error updating character: {exc}") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def delete(character_id: str) -> bool:
    return delete_local_character(character_id)