import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Mount import MountSchema
from services import mounts_service

router = fastapi.APIRouter(prefix="/mounts", tags=["mounts"])


@router.get("", response_model_exclude_none=True)
async def get_mounts(page: int = 1, page_size: int = 20) -> list[MountSchema]:
    return await mounts_service.get_all_mounts(page=page, page_size=page_size)


@router.get("/{id}", response_model_exclude_none=True)
async def get_mount(id: str):
    return await mounts_service.get_mount_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_mount(mount: MountSchema, current_user: dict = Depends(get_current_user)) -> MountSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return await mounts_service.create_mount(mount, actor_id)


@router.put("/{id}", response_model_exclude_none=True)
async def update_mount(id: str, mount: MountSchema):
    return await mounts_service.update_mount(id, mount)


@router.delete("/{id}")
async def delete_mount(id: str):
    return await mounts_service.delete_mount(id)