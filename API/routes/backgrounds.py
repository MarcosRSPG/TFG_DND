import fastapi
from fastapi import Depends
from services.authorization_service import require_write_authorization
from models.Background import BackgroundSchema
from services import backgrounds_service

router = fastapi.APIRouter(prefix="/backgrounds", tags=["backgrounds"])

@router.get("", response_model_exclude_none=True)
def get_backgrounds() -> list[BackgroundSchema]:
    """Get all backgrounds (requires X-API-Token)"""
    return backgrounds_service.get_all()

@router.get("/{id}", response_model_exclude_none=True)
def get_background(id: str):
    """Get a specific background by ID (requires X-API-Token)"""
    return backgrounds_service.get_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_background(background: BackgroundSchema, current_user: dict = Depends(require_write_authorization)) -> BackgroundSchema:
    """Create a new background (requires Authorization header with valid access token)"""
    user_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return backgrounds_service.create(background, user_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_background(id: str, background: BackgroundSchema, current_user: dict = Depends(require_write_authorization)):
    """Update a background (requires Authorization header with valid access token)"""
    return backgrounds_service.update(id, background)

@router.delete("/{id}")
def delete_background(id: str, current_user: dict = Depends(require_write_authorization)):
    """Delete a background (requires Authorization header with valid access token)"""
    return backgrounds_service.delete(id)
