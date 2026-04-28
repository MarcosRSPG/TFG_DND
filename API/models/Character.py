from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from models.Generico import BaseSchema


class ApiReferenceSchema(BaseModel):
    index: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class CharacterProficiencySchema(BaseModel):
    proficiency: ApiReferenceSchema
    value: Optional[int] = None

    model_config = ConfigDict(extra="allow")


class CharacterSpeedSchema(BaseModel):
    walk: Optional[str] = None
    fly: Optional[str] = None
    swim: Optional[str] = None
    climb: Optional[str] = None
    crawl: Optional[str] = None
    burrow: Optional[str] = None
    hover: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class CharacterCashSchema(BaseModel):
    cp: int = 0
    sp: int = 0
    gp: int = 0
    pp: int = 0

    model_config = ConfigDict(extra="allow")


class CharacterInventorySchema(BaseModel):
    items: List[str] = Field(default_factory=list)
    cash: CharacterCashSchema = Field(default_factory=CharacterCashSchema)

    model_config = ConfigDict(extra="allow")


class CharacterSpellcastingSchema(BaseModel):
    spell_slots: Dict[str, int] = Field(default_factory=dict)
    known_spells: List[str] = Field(default_factory=list)
    prepared_spells: List[str] = Field(default_factory=list)
    spell_save_dc: Optional[int] = None
    spell_attack_bonus: Optional[int] = None

    model_config = ConfigDict(extra="allow")


class CharacterSchema(BaseSchema):
    index: Optional[str] = None
    name: str
    player: Optional[str] = None
    level: int
    character_class: ApiReferenceSchema = Field(alias="class")
    subclass: Optional[ApiReferenceSchema] = None
    race: ApiReferenceSchema
    subrace: Optional[ApiReferenceSchema] = None
    alignment: str
    background: ApiReferenceSchema
    hit_points: int
    hit_dice: str
    hit_points_roll: str
    speed: CharacterSpeedSchema
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int
    proficiencies: List[CharacterProficiencySchema] = Field(default_factory=list)
    proficiency_bonus: int
    saving_throws: List[str] = Field(default_factory=list)
    inventory: CharacterInventorySchema = Field(default_factory=CharacterInventorySchema)
    spellcasting: Optional[CharacterSpellcastingSchema] = None
    notes: Optional[str] = None
    campaings: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    image: Optional[str] = None
    url: Optional[str] = None
    meta: Optional[Dict[str, Any]] = Field(default=None, alias="_meta")

    model_config = ConfigDict(
        extra="allow",
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "index": "liora",
                "name": "Liora",
                "player": "Ana_id",
                "level": 5,
                "class": {
                    "index": "cleric",
                    "name": "Cleric"
                },
                "subclass": {
                    "index": "light-domain",
                    "name": "Light Domain"
                },
                "race": {
                    "index": "human",
                    "name": "Human"
                },
                "subrace": {
                    "index": "variant-human",
                    "name": "Variant Human"
                },
                "alignment": "neutral-good",
                "background": {
                    "index": "acolyte",
                    "name": "Acolyte"
                },
                "hit_points": 7,
                "hit_dice": "2d6",
                "hit_points_roll": "1d6",
                "speed": {"walk": "30 ft."},
                "strength": 8,
                "dexterity": 14,
                "constitution": 10,
                "intelligence": 10,
                "wisdom": 8,
                "charisma": 8,
                "proficiencies": [
                    {"proficiency": {"index": "skill-insight", "name": "Skill: Insight"}}
                ],
                "proficiency_bonus": 3,
                "saving_throws": ["wis", "cha"],
                "inventory": {
                    "items": ["battleaxe", "shield"],
                    "cash": {"cp": 0, "sp": 4, "gp": 12, "pp": 0},
                },
                "spellcasting": {
                    "spell_slots": {"1": 4, "2": 3, "3": 2},
                    "known_spells": ["guiding-bolt"],
                    "prepared_spells": ["guiding-bolt"],
                    "spell_save_dc": 15,
                    "spell_attack_bonus": 7,
                },
                "notes": "Seguidora de la Aguja del Alba.",
                "campaings": ["SombraDragon2026_id"],
                "tags": ["pj", "clerigo"],
                "_meta": {
                    "is_deleted": False,
                    "image_url": "/api/images/characters/liora.png",
                    "token_url": "/api/tokens/characters/liora-token.png",
                },
            }
        },
    )