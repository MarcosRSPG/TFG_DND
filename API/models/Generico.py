from typing import Optional
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
	id: Optional[str] = None
	created_by: Optional[str] = None
	created_at: Optional[str] = None
	updated_at: Optional[str] = None

	model_config = ConfigDict(extra="allow")


class ResourceReference(BaseModel):
	index: str
	name: str
	url: str

	model_config = ConfigDict(extra="allow")

class CostSchema(BaseModel):
	quantity: int
	unit: str

	model_config = ConfigDict(extra="allow")