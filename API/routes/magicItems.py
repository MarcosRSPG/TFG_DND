import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.MagicItem import MagicItemSchema
from services import magicItems_service
router = fastapi.APIRouter(prefix="/magicItems", tags=["magicItems"])

@router.get("", response_model_exclude_none=True)
def get_magicItems() -> list[MagicItemSchema]:
    return magicItems_service.get_all_magicItems()

@router.get("/{id}", response_model_exclude_none=True)
def get_magicItem(id: str):
    return magicItems_service.get_magicItem_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_magicItem(magicItem: MagicItemSchema, current_user: dict = Depends(get_current_user)) -> MagicItemSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return magicItems_service.create_magicItem(magicItem, actor_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_magicItem(id: str, magicItem: MagicItemSchema):
    return magicItems_service.update_magicItem(id, magicItem)

@router.delete("/{id}")
def delete_magicItem(id: str):
    return magicItems_service.delete_magicItem(id)
