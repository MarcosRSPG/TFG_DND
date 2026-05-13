import fastapi
from fastapi import Depends, Request
from models.Background import BackgroundSchema
from services import backgrounds_service
from services.auth_service import get_current_user, optional_get_current_user

router = fastapi.APIRouter(prefix="/backgrounds", tags=["backgrounds"])


@router.get("", response_model_exclude_none=True)
async def get_backgrounds() -> list[BackgroundSchema]:
    return await backgrounds_service.get_all()


@router.get("/{id}", response_model_exclude_none=True)
async def get_background(id: str):
    return await backgrounds_service.get_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_background(background: BackgroundSchema, request: Request, current_user: dict = Depends(optional_get_current_user)) -> BackgroundSchema:
    if current_user and not background.created_by:
        background.created_by = current_user.get("user_id")
    return await backgrounds_service.create(background)


@router.put("/{id}", response_model_exclude_none=True)
async def update_background(id: str, background: BackgroundSchema, current_user: dict = Depends(get_current_user)):
    return await backgrounds_service.update(id, background)


@router.delete("/{id}")
async def delete_background(id: str, current_user: dict = Depends(get_current_user)):
    return await backgrounds_service.delete(id)
