import fastapi
from fastapi import Body, Depends
from services.authorization_service import require_write_authorization
from services import items_service

router = fastapi.APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model_exclude_none=True)
def get_items():
    """Get all items (requires X-API-Token)"""
    return items_service.get_all()

@router.get("/{id}", response_model_exclude_none=True)
def get_item(id: str, type: str = None):
    """Get a specific item by ID (requires X-API-Token)"""
    return items_service.get_by_id(id, type)

@router.get("/type/{type}", response_model_exclude_none=True)
def get_items_by_type(type: str = None):
    """Get items by type (requires X-API-Token)"""
    return items_service.get_by_type(type)

@router.post("", response_model_exclude_none=True)
def create_item(item: dict = Body(...), current_user: dict = Depends(require_write_authorization), type: str = None):
    """Create a new item (requires Authorization header with valid access token)"""
    user_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return items_service.create(item, type, user_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_item(id: str, item: dict = Body(...), current_user: dict = Depends(require_write_authorization), type: str = None):
    """Update an item (requires Authorization header with valid access token)"""
    if current_user:
        return items_service.update(id, item, type)
    else:
        raise fastapi.HTTPException(status_code=401, detail="Unauthorized")
    

@router.delete("/{id}")
def delete_item(id: str, current_user: dict = Depends(require_write_authorization)):
    """Delete an item (requires Authorization header with valid access token)"""
    if current_user:
        return items_service.delete(id)
    else:
        raise fastapi.HTTPException(status_code=401, detail="Unauthorized")
