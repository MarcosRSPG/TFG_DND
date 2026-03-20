import fastapi
from fastapi import Depends, HTTPException
from services import users_service
from services.auth_service import get_current_user
from models.User import UserSchema

router = fastapi.APIRouter()

@router.get("/users", response_model_exclude_none=True)
def get_users(current_user: dict = Depends(get_current_user)) -> list[UserSchema]:
    return users_service.get_all_users()

@router.get("/users/{id}", response_model_exclude_none=True)
def get_user(id: str, current_user: dict = Depends(get_current_user)) -> UserSchema:
    return users_service.get_user_by_id(id)

@router.post("/users", response_model_exclude_none=True)
def create_user(user: UserSchema) -> UserSchema:
    return users_service.create_user(user)

@router.put("/users/{id}", response_model_exclude_none=True)
def update_user(id: str, user: UserSchema, current_user: dict = Depends(get_current_user)) -> UserSchema:
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return users_service.update_user(id, user)

@router.delete("/users/{id}")
def delete_user(id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return users_service.delete_user(id)
