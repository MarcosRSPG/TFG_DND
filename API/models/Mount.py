from typing import Any, Dict, List
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference, CostSchema


class SpeedSchema(BaseModel):
	quantity: int
	unit: str

	model_config = ConfigDict(extra="allow")


class MountSchema(BaseSchema):
	index: str
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
	vehicle_category: str
	cost: CostSchema
	speed: SpeedSchema
	capacity: str
	url: str
	contents: List[Dict[str, Any]] = Field(default_factory=list)
	properties: List[Dict[str, Any]] = Field(default_factory=list)

	model_config = ConfigDict(extra="allow")
