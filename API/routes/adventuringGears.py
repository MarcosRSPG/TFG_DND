import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.AdventuringGear import AdventuringGearSchema
from services import adventuringGears_service

router = fastapi.APIRouter(prefix="/adventuringgears", tags=["adventuringgears"])


@router.get("", response_model_exclude_none=True)
async def get_adventuringGears(page: int = 1, page_size: int = 20) -> list[AdventuringGearSchema]:
    return await adventuringGears_service.get_all(page=page, page_size=page_size)


@router.get("/{id}", response_model_exclude_none=True)
async def get_adventuringGear(id: str):
    return await adventuringGears_service.get_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_adventuringGear(adventuringGear: AdventuringGearSchema, current_user: dict = Depends(get_current_user)) -> AdventuringGearSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return await adventuringGears_service.create(adventuringGear, actor_id)


@router.put("/{id}", response_model_exclude_none=True)
async def update_adventuringGear(id: str, adventuringGear: AdventuringGearSchema):
    return await adventuringGears_service.update(id, adventuringGear)


@router.delete("/{id}")
async def delete_adventuringGear(id: str):
    return await adventuringGears_service.delete_adventuringgear(id)