import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Mount import MountSchema
from services import mounts_service
router = fastapi.APIRouter(prefix="/mounts", tags=["mounts"])

@router.get("", response_model_exclude_none=True)
def get_mounts() -> list[MountSchema]:
    return mounts_service.get_all_mounts()

@router.get("/{id}", response_model_exclude_none=True)
def get_mount(id: str):
    return mounts_service.get_mount_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_mount(mount: MountSchema, current_user: dict = Depends(get_current_user)) -> MountSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return mounts_service.create_mount(mount, actor_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_mount(id: str, mount: MountSchema):
    return mounts_service.update_mount(id, mount)

@router.delete("/{id}")
def delete_mount(id: str):
    return mounts_service.delete_mount(id)
