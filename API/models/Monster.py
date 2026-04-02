from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ReferenceSchema(BaseModel):
    """Generic reference to another D&D entity"""
    index: str
    name: str
    url: str


class ArmorClassSchema(BaseModel):
    """Armor class entry for monsters"""
    type: str
    value: int
    spell: Optional[ReferenceSchema] = None


class SpeedSchema(BaseModel):
    """Movement speeds for monsters"""
    walk: Optional[str] = None
    fly: Optional[str] = None
    swim: Optional[str] = None
    climb: Optional[str] = None
    crawl: Optional[str] = None
    burrow: Optional[str] = None
    hover: Optional[str] = None


class ProficiencySchema(BaseModel):
    """Proficiency entry"""
    value: int
    proficiency: ReferenceSchema


class DamageSchema(BaseModel):
    """Damage entry"""
    damage_type: ReferenceSchema
    damage_dice: Optional[str] = None


class AbilitySchema(BaseModel):
    """Special ability or action"""
    name: str
    desc: str
    damage: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    spellcasting: Optional[Dict[str, Any]] = None
    attack_bonus: Optional[int] = None
    actions: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class SensesSchema(BaseModel):
    """Senses entry"""
    passive_perception: Optional[int] = None
    darkvision: Optional[str] = None
    truesight: Optional[str] = None


class AreaOfEffectSchema(BaseModel):
    """Area of effect for special abilities"""
    type: str
    size: int


class LegendaryActionSchema(BaseModel):
    """Legendary action entry"""
    name: str
    desc: str
    attack_bonus: Optional[int] = None
    damage: Optional[List[DamageSchema]] = None
    dc: Optional[Dict[str, Any]] = None


class Monster(BaseModel):
    """D&D 5e Monster model"""
    index: str
    name: str
    desc: str
    size: str
    type: str
    subtype: Optional[str] = None
    alignment: str
    armor_class: List[ArmorClassSchema]
    hit_points: int
    hit_dice: str
    hit_points_roll: str
    speed: SpeedSchema
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int
    proficiencies: Optional[List[ProficiencySchema]] = Field(default_factory=list)
    damage_vulnerabilities: Optional[List[str]] = Field(default_factory=list)
    damage_resistances: Optional[List[str]] = Field(default_factory=list)
    damage_immunities: Optional[List[str]] = Field(default_factory=list)
    condition_immunities: Optional[List[str]] = Field(default_factory=list)
    senses: Optional[SensesSchema] = None
    languages: Optional[str] = None
    challenge_rating: float
    proficiency_bonus: int
    xp: int
    special_abilities: Optional[List[AbilitySchema]] = Field(default_factory=list)
    actions: Optional[List[AbilitySchema]] = Field(default_factory=list)
    legendary_actions: Optional[List[LegendaryActionSchema]] = Field(default_factory=list)
    reactions: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    image: Optional[str] = None
    forms: Optional[List[str]] = Field(default_factory=list)
    url: str
    updated_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "index": "archmage",
                "name": "Archmage",
                "desc": "Archmages are powerful spellcasters...",
                "size": "Medium",
                "type": "humanoid",
                "subtype": "any race",
                "alignment": "any alignment",
                "armor_class": [
                    {"type": "dex", "value": 12}
                ],
                "hit_points": 99,
                "hit_dice": "18d8",
                "hit_points_roll": "18d8+18",
                "speed": {"walk": "30 ft."},
                "strength": 10,
                "dexterity": 14,
                "constitution": 12,
                "intelligence": 20,
                "wisdom": 15,
                "charisma": 16,
                "challenge_rating": 12,
                "proficiency_bonus": 4,
                "xp": 8400,
                "url": "/api/2014/monsters/archmage"
            }
        }
