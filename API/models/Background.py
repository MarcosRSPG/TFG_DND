from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class BackgroundSchema(BaseModel):
    id: Optional[str] = None
    name: str
    index: Optional[str] = None
    starting_proficiencies: Optional[List[Dict[str, Any]]] = None
    language_options: Optional[Dict[str, Any]] = None
    starting_equipment: Optional[List[Dict[str, Any]]] = None
    starting_equipment_options: Optional[List[Dict[str, Any]]] = None
    feature: Optional[Dict[str, Any]] = None
    personality_traits: Optional[Dict[str, Any]] = None
    ideals: Optional[Dict[str, Any]] = None
    bonds: Optional[Dict[str, Any]] = None
    flaws: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(extra='allow')