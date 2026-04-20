import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Weapon import WeaponSchema
from services import weapons_service

router = fastapi.APIRouter(prefix="/weapons", tags=["weapons"])


@router.get("", response_model_exclude_none=True)
async def get_weapons(page: int = 1, page_size: int = 20) -> list[WeaponSchema]:
    return await weapons_service.get_all_weapons(page=page, page_size=page_size)


@router.get("/{id}", response_model_exclude_none=True)
async def get_weapon(id: str):
    return await weapons_service.get_weapon_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_weapon(weapon: WeaponSchema, current_user: dict = Depends(get_current_user)) -> WeaponSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return await weapons_service.create_weapon(weapon, actor_id)


@router.put("/{id}", response_model_exclude_none=True)
async def update_weapon(id: str, weapon: WeaponSchema):
    return await weapons_service.update_weapon(id, weapon)


@router.delete("/{id}")
async def delete_weapon(id: str):
    return await weapons_service.delete_weapon(id)