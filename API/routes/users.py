import fastapi
from fastapi import Depends, HTTPException
from services import users_service
from services.auth_service import get_current_user
from services import login_service as login_svc
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

@router.put("/{id}")
async def update_user(
    id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("user_id") != id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify current password if changing password
    if payload.get("password"):
        current_password = payload.pop("current_password", None)
        if not current_password:
            raise HTTPException(status_code=400, detail="current_password is required to change password")
        full_user = await users_service.get_by_id(id, include_password=True)
        if not full_user or not await login_svc.verify_password(current_password, full_user.password):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

    user_schema = UserSchema(
        username=payload.get("username") or current_user.get("username", ""),
        email=payload.get("email") or current_user.get("email", ""),
        password=payload.get("password"),
    )
    updated = await users_service.update(id, user_schema)

    new_token = login_svc.create_access_token({
        "user_id": updated.id,
        "email": updated.email,
        "username": updated.username,
        "isAdmin": updated.role == "admin",
    })
    return {
        "id": updated.id,
        "username": updated.username,
        "email": updated.email,
        "role": updated.role,
        "access_token": new_token,
    }

@router.delete("/{id}")
async def delete_user(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("user_id") != id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await users_service.delete(id)
