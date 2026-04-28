from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference, CostSchema


class AdventuringGearSchema(BaseSchema):
    index: Optional[str] = None
    name: str
    desc: List[str] = Field(default_factory=list)
    special: List[str] = Field(default_factory=list)
    equipment_category: ResourceReference = Field(
        default_factory=lambda: ResourceReference(
            index="adventuring-gear",
            name="Adventuring Gear",
            url="/api/2014/equipment-categories/adventuring-gear",
        )
    )
    gear_category: Optional[ResourceReference] = None
    quantity: Optional[int] = None
    cost: Optional[CostSchema] = None
    weight: Optional[float] = None
    url: Optional[str] = None
    contents: List[Dict[str, Any]] = Field(default_factory=list)
    properties: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(extra='allow')