from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference, CostSchema


class ToolSchema(BaseSchema):
	index: Optional[str] = None
	name: str
	equipment_category: ResourceReference = Field(
		default_factory=lambda: ResourceReference(
			index="tools",
			name="Tools",
			url="/api/2014/equipment-categories/tools",
		)
	)
	tool_category: str
	cost: CostSchema
	weight: Optional[float] = None
	desc: List[str] = Field(default_factory=list)
	special: List[str] = Field(default_factory=list)
	url: Optional[str] = None
	contents: List[Dict[str, Any]] = Field(default_factory=list)
	properties: List[Dict[str, Any]] = Field(default_factory=list)

	model_config = ConfigDict(extra="allow")
