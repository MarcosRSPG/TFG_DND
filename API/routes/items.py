import fastapi
from fastapi import Depends, HTTPException
from services.auth_service import get_current_user
from services import items_service
router = fastapi.APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model_exclude_none=True)
def get_items():
    return items_service.get_all_items()

@router.get("/{id}", response_model_exclude_none=True)
def get_item(id: str):
    return items_service.get_item_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_item(item, current_user: dict = Depends(get_current_user)):
    return items_service.create_item(item, current_user.get("_id"))

@router.put("/{id}", response_model_exclude_none=True)
def update_item(id: str, item, current_user: dict = Depends(get_current_user)):
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return items_service.update_item(id, item)

@router.delete("/{id}")
def delete_item(id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return items_service.delete_item(id)
