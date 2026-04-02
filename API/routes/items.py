import fastapi
from fastapi import Body, Depends
from services.auth_service import get_current_user
from services import items_service
router = fastapi.APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model_exclude_none=True)
def get_items():
    return items_service.get_all()

@router.get("/{id}", response_model_exclude_none=True)
def get_item(id: str, type: str = None):
    return items_service.get_by_id(id, type)

@router.get("/type/{type}", response_model_exclude_none=True)
def get_items_by_type(type: str = None):
    return  items_service.get_by_type(type)

@router.post("", response_model_exclude_none=True)
def create_item(item: dict = Body(...), current_user: dict = Depends(get_current_user), type: str = None):
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return items_service.create(item, type, actor_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_item(id: str, item: dict = Body(...), type: str = None):
    return items_service.update(id, item, type)

@router.delete("/{id}")
def delete_item(id: str):
    return items_service.delete(id)
