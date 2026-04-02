import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Background import BackgroundSchema
from services import backgrounds_service
router = fastapi.APIRouter(prefix="/backgrounds", tags=["backgrounds"])

@router.get("", response_model_exclude_none=True)
def get_backgrounds() -> list[BackgroundSchema]:
    return backgrounds_service.get_all()

@router.get("/{id}", response_model_exclude_none=True)
def get_background(id: str):
    return backgrounds_service.get_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_background(background: BackgroundSchema, current_user: dict = Depends(get_current_user)) -> BackgroundSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return backgrounds_service.create(background, actor_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_background(id: str, background: BackgroundSchema):
    return backgrounds_service.update(id, background)

@router.delete("/{id}")
def delete_background(id: str):
    return backgrounds_service.delete(id)
