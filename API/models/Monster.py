from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReferenceSchema(BaseModel):
    """Generic reference to another D&D entity"""
    index: Optional[str] = None
    name: str
    url: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class ArmorClassSchema(BaseModel):
    """Armor class entry for monsters"""
    type: str
    value: int
    spell: Optional[ReferenceSchema] = None
    armor: List[ReferenceSchema] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class SpeedSchema(BaseModel):
    """Movement speeds for monsters"""
    walk: Optional[str | int | float] = None
    fly: Optional[str | int | float] = None
    swim: Optional[str | int | float] = None
    climb: Optional[str | int | float] = None
    crawl: Optional[str | int | float] = None
    burrow: Optional[str | int | float] = None
    hover: Optional[bool | str | int | float] = None

    model_config = ConfigDict(extra="allow")


class ProficiencySchema(BaseModel):
    """Proficiency entry"""
    value: int
    proficiency: ReferenceSchema

    model_config = ConfigDict(extra="allow")


class DamageSchema(BaseModel):
    """Damage entry"""
    damage_type: ReferenceSchema
    damage_dice: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class AbilitySchema(BaseModel):
    """Special ability or action"""
    name: str
    desc: str
    damage: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    spellcasting: Optional[Dict[str, Any]] = None
    attack_bonus: Optional[int] = None
    actions: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    usage: Optional[Dict[str, Any]] = None
    dc: Optional[Dict[str, Any]] = None
    multiattack_type: Optional[str] = None
    area_of_effect: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="allow")


class SensesSchema(BaseModel):
    """Senses entry"""
    passive_perception: Optional[int] = None
    darkvision: Optional[str] = None
    blindsight: Optional[str] = None
    truesight: Optional[str] = None
    tremorsense: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class AreaOfEffectSchema(BaseModel):
    """Area of effect for special abilities"""
    type: str
    size: int

    model_config = ConfigDict(extra="allow")


class LegendaryActionSchema(BaseModel):
    """Legendary action entry"""
    name: str
    desc: str
    attack_bonus: Optional[int] = None
    damage: Optional[List[DamageSchema]] = None
    dc: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="allow")


class Monster(BaseModel):
    """D&D 5e Monster model"""
    index: Optional[str] = None
    name: str
    desc: Optional[str] = None
    size: str
    type: str
    subtype: Optional[str] = None
    alignment: str
    armor_class: List[ArmorClassSchema] = Field(default_factory=list)
    hit_points: Optional[int] = None
    hit_dice: str
    hit_points_roll: Optional[str] = None
    speed: SpeedSchema = Field(default_factory=SpeedSchema)
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
    condition_immunities: Optional[List[ReferenceSchema | str]] = Field(default_factory=list)
    senses: Optional[SensesSchema] = None
    languages: Optional[str] = None
    spellcasting: Optional[Dict[str, Any]] = None
    challenge_rating: float | str
    proficiency_bonus: Optional[int] = None
    xp: Optional[int] = None
    special_abilities: Optional[List[AbilitySchema]] = Field(default_factory=list)
    actions: Optional[List[AbilitySchema]] = Field(default_factory=list)
    legendary_actions: Optional[List[LegendaryActionSchema]] = Field(default_factory=list)
    reactions: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    image: Optional[str] = None
    forms: Optional[List[str]] = Field(default_factory=list)
    environment: Optional[List[str]] = Field(default_factory=list)
    url: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(
        extra="allow",
        json_schema_extra={
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
        },
    )
