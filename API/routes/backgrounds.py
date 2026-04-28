import fastapi
from models.Background import BackgroundSchema
from services import backgrounds_service

router = fastapi.APIRouter(prefix="/backgrounds", tags=["backgrounds"])


@router.get("", response_model_exclude_none=True)
async def get_backgrounds() -> list[BackgroundSchema]:
    return await backgrounds_service.get_all()


@router.get("/{id}", response_model_exclude_none=True)
async def get_background(id: str):
    return await backgrounds_service.get_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_background(background: BackgroundSchema) -> BackgroundSchema:
    return await backgrounds_service.create(background)


@router.put("/{id}", response_model_exclude_none=True)
async def update_background(id: str, background: BackgroundSchema):
    return await backgrounds_service.update(id, background)


@router.delete("/{id}")
async def delete_background(id: str):
    return await backgrounds_service.delete(id)
