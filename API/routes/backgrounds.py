import fastapi
from fastapi import Depends
from services.authorization_service import require_write_authorization
from models.Background import BackgroundSchema
from services import backgrounds_service

router = fastapi.APIRouter(prefix="/backgrounds", tags=["backgrounds"])


@router.get("", response_model_exclude_none=True)
async def get_backgrounds(page: int = 1, page_size: int = 20) -> list[BackgroundSchema]:
    return await backgrounds_service.get_all(page=page, page_size=page_size)


@router.get("/{id}", response_model_exclude_none=True)
async def get_background(id: str):
    return await backgrounds_service.get_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_background(background: BackgroundSchema, current_user: dict = Depends(require_write_authorization)) -> BackgroundSchema:
    user_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return await backgrounds_service.create(background, user_id)


@router.put("/{id}", response_model_exclude_none=True)
async def update_background(id: str, background: BackgroundSchema, current_user: dict = Depends(require_write_authorization)):
    return await backgrounds_service.update(id, background)


@router.delete("/{id}")
async def delete_background(id: str, current_user: dict = Depends(require_write_authorization)):
    return await backgrounds_service.delete(id)