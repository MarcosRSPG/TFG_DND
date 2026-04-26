from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.Generico import BaseSchema, ResourceReference


class MagicItemRaritySchema(BaseModel):
	name: str

	model_config = ConfigDict(extra="allow")


class MagicItemSchema(BaseSchema):
	index: Optional[str] = None
	name: str
	type: str = Field(default="magicItem")
	equipment_category: ResourceReference
	rarity: MagicItemRaritySchema
	variants: List[ResourceReference] = Field(default_factory=list)
	variant: bool = False
	desc: List[str] = Field(default_factory=list)
	image: Optional[str] = None
	url: Optional[str] = None

	model_config = ConfigDict(extra="allow")