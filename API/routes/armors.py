import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Armor import ArmorSchema
from services import armors_service

router = fastapi.APIRouter(prefix="/armors", tags=["armors"])


@router.get("", response_model_exclude_none=True)
async def get_armors(page: int = 1, page_size: int = 20) -> list[ArmorSchema]:
    return await armors_service.get_all_armors(page=page, page_size=page_size)


@router.get("/{id}", response_model_exclude_none=True)
async def get_armor(id: str):
    return await armors_service.get_armor_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_armor(armor: ArmorSchema, current_user: dict = Depends(get_current_user)) -> ArmorSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return await armors_service.create_armor(armor, actor_id)


@router.put("/{id}", response_model_exclude_none=True)
async def update_armor(id: str, armor: ArmorSchema):
    return await armors_service.update_armor(id, armor)


@router.delete("/{id}")
async def delete_armor(id: str):
    return await armors_service.delete_armor(id)