import fastapi
from fastapi import Body, Request
from services import items_service
from utils.image_utils import parse_form_or_json

router = fastapi.APIRouter(prefix="/items", tags=["items"])

# Maps frontend item type to the images subdirectory
_TYPE_TO_IMAGE_DIR: dict[str, str] = {
    "weapon": "equipment",
    "armor": "equipment",
    "tool": "equipment",
    "mount": "equipment",
    "adventuringgear": "equipment",
    "magicitem": "magic-items",
}


@router.get("", response_model_exclude_none=True)
async def get_items():
    return await items_service.get_all()


@router.get("/{id}", response_model_exclude_none=True)
async def get_item(id: str, type: str = None):
    return await items_service.get_by_id(id, type)


@router.get("/type/{type}", response_model_exclude_none=True)
async def get_items_by_type(type: str = None):
    return await items_service.get_by_type(type)


@router.post("", response_model_exclude_none=True)
async def create_item(request: Request, type: str = None):
    image_dir = _TYPE_TO_IMAGE_DIR.get(type or "", "equipment")
    item_data = await parse_form_or_json(request, image_dir)
    return await items_service.create(item_data, type)


@router.put("/{id}", response_model_exclude_none=True)
async def update_item(id: str, item: dict = Body(...), type: str = None):
    return await items_service.update(id, item, type)


@router.delete("/{id}")
async def delete_item(id: str):
    return await items_service.delete(id)
