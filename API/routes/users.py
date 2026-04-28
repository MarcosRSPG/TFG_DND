import fastapi
from fastapi import HTTPException
from services import users_service
from models.User import UserSchema

router = fastapi.APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model_exclude_none=True)
async def get_users() -> list[UserSchema]:
    return await users_service.get_all()

@router.get("/{id}", response_model_exclude_none=True)
async def get_user(id: str) -> UserSchema:
    return await users_service.get_by_id(id)

@router.post("", response_model_exclude_none=True)
async def create_user(user: UserSchema) -> UserSchema:
    return await users_service.create(user)

@router.put("/{id}", response_model_exclude_none=True)
async def update_user(id: str, user: UserSchema) -> UserSchema:
    return await users_service.update(id, user)

@router.delete("/{id}")
async def delete_user(id: str):
    return await users_service.delete(id)
