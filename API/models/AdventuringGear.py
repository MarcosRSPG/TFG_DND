from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from Generico import BaseSchema, ResourceReference, CostSchema


class AdventuringGearSchema(BaseSchema):
    index: str
    name: str
    desc: List[str] = Field(default_factory=list)
    special: List[str] = Field(default_factory=list)
    equipment_category: ResourceReference = ResourceReference({
        "index": "adventuring-gear",
        "name": "Adventuring Gear",
        "url": "/api/2014/equipment-categories/adventuring-gear"
    })
    gear_category: ResourceReference
    quantity: Optional[int] = None
    cost: CostSchema
    weight: Optional[float] = None
    url: str
    contents: List[Dict[str, Any]] = Field(default_factory=list)
    properties: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(extra='allow')