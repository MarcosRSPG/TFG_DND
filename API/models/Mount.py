from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference, CostSchema


class SpeedSchema(BaseModel):
	quantity: int
	unit: str

	model_config = ConfigDict(extra="allow")


class MountSchema(BaseSchema):
	index: Optional[str] = None
	name: str
	desc: List[str] = Field(default_factory=list)
	special: List[str] = Field(default_factory=list)
	equipment_category: ResourceReference = Field(
		default_factory=lambda: ResourceReference(
			index="mounts-and-vehicles",
			name="Mounts and Vehicles",
			url="/api/2014/equipment-categories/mounts-and-vehicles",
		)
	)
	vehicle_category: str | None = None
	cost: CostSchema | None = None
	speed: SpeedSchema | None = None
	capacity: str | None = None
	url: Optional[str] = None
	contents: List[Dict[str, Any]] = Field(default_factory=list)
	properties: List[Dict[str, Any]] = Field(default_factory=list)

	model_config = ConfigDict(extra="allow")
