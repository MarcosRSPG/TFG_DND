from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from Generico import BaseSchema, CostSchema, ResourceReference


class WeaponDamageSchema(BaseModel):
    damage_dice: str
    damage_type: ResourceReference

    model_config = ConfigDict(extra="allow")


class WeaponRangeSchema(BaseModel):
    normal: int
    long: Optional[int] = None

    model_config = ConfigDict(extra="allow")


class WeaponSchema(BaseSchema):
    index: str
    name: str
    desc: List[str] = Field(default_factory=list)
    special: List[str] = Field(default_factory=list)
    equipment_category: ResourceReference = ResourceReference({
        "index": "weapons",
        "name": "Weapons",
        "url": "/api/2014/equipment-categories/weapons"
    })
    weapon_category: str
    weapon_range: str
    category_range: str
    cost: CostSchema
    damage: WeaponDamageSchema
    range: WeaponRangeSchema
    weight: Optional[float] = None
    properties: List[ResourceReference] = Field(default_factory=list)
    url: str
    contents: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")
