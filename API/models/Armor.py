from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference, CostSchema



class ArmorClassSchema(BaseModel):
	base: int
	dex_bonus: bool
	max_bonus: Optional[int] = None

	model_config = ConfigDict(extra="allow")



class ArmorSchema(BaseSchema):
	index: Optional[str] = None
	name: str
	desc: List[str] = Field(default_factory=list)
	special: List[str] = Field(default_factory=list)
	equipment_category: ResourceReference = Field(
		default_factory=lambda: ResourceReference(
			index="armor",
			name="Armor",
			url="/api/2014/equipment-categories/armor",
		)
	)
	armor_category: str
	armor_class: ArmorClassSchema
	str_minimum: int = 0
	stealth_disadvantage: bool = False
	weight: Optional[float] = None
	cost: CostSchema
	url: Optional[str] = None
	contents: List[Dict[str, Any]] = Field(default_factory=list)
	properties: List[Dict[str, Any]] = Field(default_factory=list)

	model_config = ConfigDict(extra="allow")
