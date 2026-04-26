from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, CostSchema, ResourceReference


class WeaponDamageSchema(BaseModel):
    damage_dice: str
    damage_type: ResourceReference

    model_config = ConfigDict(extra="allow")


class WeaponRangeSchema(BaseModel):
    normal: int
    long: Optional[int] = None

    model_config = ConfigDict(extra="allow")


class WeaponSchema(BaseSchema):
    index: Optional[str] = None
    name: str
    desc: List[str] = Field(default_factory=list)
    special: List[str] = Field(default_factory=list)
    equipment_category: Optional[ResourceReference] = None
    weapon_category: Optional[str] = None
    weapon_range: Optional[str] = None
    category_range: Optional[str] = None
    cost: Optional[CostSchema] = None
    damage: Optional[WeaponDamageSchema] = None
    range: Optional[WeaponRangeSchema] = None
    weight: Optional[float] = None
    properties: List[ResourceReference] = Field(default_factory=list)
    url: Optional[str] = None
    contents: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")
