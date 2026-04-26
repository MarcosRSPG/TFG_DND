from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference


class EquipmentItemSchema(BaseModel):
    equipment: ResourceReference
    quantity: int

    model_config = ConfigDict(extra="allow")


class FeatureSchema(BaseModel):
    name: str
    desc: List[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class BackgroundSchema(BaseSchema):
    index: Optional[str] = None
    name: str
    starting_proficiencies: List[ResourceReference] = Field(default_factory=list)
    language_options: Optional[Dict[str, Any]] = None
    starting_equipment: List[EquipmentItemSchema] = Field(default_factory=list)
    starting_equipment_options: List[Dict[str, Any]] = Field(default_factory=list)
    feature: Optional[FeatureSchema] = None
    personality_traits: Optional[Dict[str, Any]] = None
    ideals: Optional[Dict[str, Any]] = None
    bonds: Optional[Dict[str, Any]] = None
    flaws: Optional[Dict[str, Any]] = None
    url: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra='allow')