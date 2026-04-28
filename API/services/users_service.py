from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from fastapi import HTTPException
from db import get_db
from models.User import UserSchema

async def _get_users_collection():
    db = await get_db()
    return db["users"]

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

async def get_all() -> list[UserSchema]:
    try:
        collection = await _get_users_collection()
        docs = await collection.find({}).to_list(length=None)
        return [_to_schema(doc) for doc in docs]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {exc}") from exc

async def get_by_id(user_id: str) -> UserSchema:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    
    collection = await _get_users_collection()
    doc = await collection.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_schema(doc)

async def get_by_email(email: str, include_password: bool = False) -> UserSchema | None:
    collection = await _get_users_collection()
    doc = await collection.find_one({"email": email})
    if not doc:
        return None
    return _to_schema(doc, include_password=include_password)

async def get_by_login(identifier: str, include_password: bool = False) -> UserSchema | None:
    collection = await _get_users_collection()
    doc = await collection.find_one({"$or": [{"email": identifier}, {"username": identifier}]})
    if not doc:
        return None
    return _to_schema(doc, include_password=include_password)

async def create(user_schema: UserSchema) -> UserSchema:
    user_data = user_schema.model_dump(exclude_none=True)
    
    collection = await _get_users_collection()
    existing = await collection.find_one({"email": user_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya existe en la base de datos.")
    
    now = datetime.now(timezone.utc).isoformat()
    import bcrypt
    hashed_password = bcrypt.hashpw(user_data["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "username": user_data["username"],
        "email": user_data["email"],
        "password": hashed_password,
        "role": user_data.get("role", "user"),
        "created_by": user_data.get("created_by", "api"),
        "created_at": user_data.get("created_at", now),
        "updated_at": user_data.get("updated_at", now),
    }
    
    try:
        result = await collection.insert_one(doc)
        created = await collection.find_one({"_id": result.inserted_id})
        return _to_schema(created)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creating user: {exc}") from exc

async def update(user_id: str, user: UserSchema) -> UserSchema:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    
    updates = user.model_dump(exclude_none=True, exclude={"id", "created_by", "created_at"})
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if not updates:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    collection = await _get_users_collection()
    result = await collection.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated = await collection.find_one({"_id": ObjectId(user_id)})
    return _to_schema(updated)

async def delete(user_id: str) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    
    collection = await _get_users_collection()
    result = await collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"deleted": True, "user_id": user_id}
