import fastapi
from fastapi import Depends
from services.auth_service import get_current_user
from models.Tool import ToolSchema
from services import tools_service
router = fastapi.APIRouter(prefix="/tools", tags=["tools"])

@router.get("", response_model_exclude_none=True)
def get_tools() -> list[ToolSchema]:
    return tools_service.get_all_tools()

@router.get("/{id}", response_model_exclude_none=True)
def get_tool(id: str):
    return tools_service.get_tool_by_id(id)

@router.post("", response_model_exclude_none=True)
def create_tool(tool: ToolSchema, current_user: dict = Depends(get_current_user)) -> ToolSchema:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return tools_service.create_tool(tool, actor_id)

@router.put("/{id}", response_model_exclude_none=True)
def update_tool(id: str, tool: ToolSchema):
    return tools_service.update_tool(id, tool)

@router.delete("/{id}")
def delete_tool(id: str):
    return tools_service.delete_tool(id)
