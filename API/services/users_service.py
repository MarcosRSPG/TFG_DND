from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import HTTPException
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from models.User import UserSchema
from config import MONGODB_DATABASE, MONGODB_PASSWORD, MONGODB_PORT, MONGODB_USERNAME

MONGODB_URI = F"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@mongodb:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"


_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DATABASE]
_users = _db["users"]


def _to_schema(doc: dict, include_password: bool = False) -> UserSchema:
    payload = {
        "id": str(doc.get("_id")),
        "username": doc.get("username", ""),
        "email": doc.get("email", ""),
        "role": doc.get("role", "user"),
        "created_by": doc.get("created_by"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }
    if include_password:
        payload["password"] = doc.get("password")
    return UserSchema(**payload)


def get_all_users() -> list[UserSchema]:
    try:
        docs = list(_users.find({}))
        return [_to_schema(doc) for doc in docs]
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {exc}") from exc


def get_user_by_id(user_id: str) -> UserSchema:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    doc = _users.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_schema(doc)


def get_user_by_email(email: str, include_password: bool = False) -> UserSchema | None:
    doc = _users.find_one({"email": email})
    if not doc:
        return None
    return _to_schema(doc, include_password=include_password)


def get_user_by_login(identifier: str, include_password: bool = False) -> UserSchema | None:
    doc = _users.find_one({"$or": [{"email": identifier}, {"username": identifier}]})
    if not doc:
        return None
    return _to_schema(doc, include_password=include_password)


def create_user(user_schema: UserSchema) -> UserSchema:
    user_data = user_schema.model_dump(exclude_none=True)

    existing = _users.find_one({"email": user_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya existe en la base de datos.")

    password = user_data.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "username": user_data["username"],
        "email": user_data["email"],
        "password": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role": user_data.get("role", "user"),
        "created_by": user_data.get("created_by", "api"),
        "created_at": user_data.get("created_at", now),
        "updated_at": user_data.get("updated_at", now),
    }

    try:
        result = _users.insert_one(doc)
        created = _users.find_one({"_id": result.inserted_id})
        
        return _to_schema(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Error creating user: {exc}") from exc


def update_user(user_id: str, user: UserSchema) -> UserSchema:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    updates = user.model_dump(exclude_none=True, exclude={"_id", "created_by", "created_at"})

    if "password" in updates:
        updates["password"] = bcrypt.hashpw(
            updates["password"].encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")

    result = _users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated = _users.find_one({"_id": ObjectId(user_id)})
    return _to_schema(updated)


def delete_user(user_id: str) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = _users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"deleted": True, "user_id": user_id}
