import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Weapon import WeaponSchema
from services import weapons_service
router = fastapi.APIRouter(prefix="/weapons", tags=["weapons"])

@router.get("", response_model_exclude_none=True)
def get_weapons() -> list[WeaponSchema]:
    return weapons_service.get_all_weapons()

@router.get("/{id}", response_model_exclude_none=True)
def get_weapon(id: str):
    return weapons_service.get_weapon_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_weapon(weapon: WeaponSchema, current_user: dict = Depends(get_current_user)) -> WeaponSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return weapons_service.create_weapon(weapon, actor_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_weapon(id: str, weapon: WeaponSchema):
    return weapons_service.update_weapon(id, weapon)

@router.delete("/{id}")
def delete_weapon(id: str):
    return weapons_service.delete_weapon(id)
