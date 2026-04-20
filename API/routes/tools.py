import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Tool import ToolSchema
from services import tools_service

router = fastapi.APIRouter(prefix="/tools", tags=["tools"])


@router.get("", response_model_exclude_none=True)
async def get_tools(page: int = 1, page_size: int = 20) -> list[ToolSchema]:
    return await tools_service.get_all_tools(page=page, page_size=page_size)


@router.get("/{id}", response_model_exclude_none=True)
async def get_tool(id: str):
    return await tools_service.get_tool_by_id(id)


@router.post("", response_model_exclude_none=True)
async def create_tool(tool: ToolSchema, current_user: dict = Depends(get_current_user)) -> ToolSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return await tools_service.create_tool(tool, actor_id)


@router.put("/{id}", response_model_exclude_none=True)
async def update_tool(id: str, tool: ToolSchema):
    return await tools_service.update_tool(id, tool)


@router.delete("/{id}")
async def delete_tool(id: str):
    return await tools_service.delete_tool(id)