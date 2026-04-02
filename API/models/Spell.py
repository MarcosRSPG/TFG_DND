from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class ReferenceSchema(BaseModel):
    """Generic reference to another D&D entity"""
    index: str
    name: str
    url: str


class DamageTypeSchema(BaseModel):
    """Damage type with scaling"""
    damage_type: ReferenceSchema
    damage_at_slot_level: Optional[Dict[str, str]] = None


class DCSchema(BaseModel):
    """Difficulty class for spell saves"""
    dc_type: ReferenceSchema
    dc_success: str


class AreaOfEffectSchema(BaseModel):
    """Area of effect for spell"""
    type: str
    size: int


class Spell(BaseModel):
    """D&D 5e Spell model"""
    index: str
    name: str
    desc: List[str]
    higher_level: Optional[List[str]] = Field(default_factory=list)
    range: str
    components: List[str]
    material: Optional[str] = None
    ritual: bool
    duration: str
    concentration: bool
    casting_time: str
    level: int
    damage: Optional[DamageTypeSchema] = None
    dc: Optional[DCSchema] = None
    area_of_effect: Optional[AreaOfEffectSchema] = None
    school: ReferenceSchema
    classes: List[ReferenceSchema]
    subclasses: Optional[List[ReferenceSchema]] = Field(default_factory=list)
    url: str
    updated_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "index": "fireball",
                "name": "Fireball",
                "desc": [
                    "A bright streak flashes from your pointing finger to a point you choose within range..."
                ],
                "higher_level": [
                    "When you cast this spell using a spell slot of 4th level or higher..."
                ],
                "range": "150 feet",
                "components": ["V", "S", "M"],
                "material": "A tiny ball of bat guano and sulfur.",
                "ritual": False,
                "duration": "Instantaneous",
                "concentration": False,
                "casting_time": "1 action",
                "level": 3,
                "damage": {
                    "damage_type": {
                        "index": "fire",
                        "name": "Fire",
                        "url": "/api/2014/damage-types/fire"
                    },
                    "damage_at_slot_level": {
                        "3": "8d6",
                        "4": "9d6"
                    }
                },
                "school": {
                    "index": "evocation",
                    "name": "Evocation",
                    "url": "/api/2014/magic-schools/evocation"
                },
                "classes": [
                    {
                        "index": "sorcerer",
                        "name": "Sorcerer",
                        "url": "/api/2014/classes/sorcerer"
                    }
                ],
                "url": "/api/2014/spells/fireball"
            }
        }
