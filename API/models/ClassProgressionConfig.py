from pydantic import BaseModel, Field
from typing import Optional, List


class ProgressionEntry(BaseModel):
    """Single level-to-value mapping in a progression column"""
    level: int
    value: str


class ProgressionColumn(BaseModel):
    """Column definition for class progression table"""
    id: str
    label: str
    cssClass: Optional[str] = None
    source: Optional[str] = Field(default=None, pattern="^(class_specific|spellcasting)$")
    key: Optional[str] = None
    progression: List[ProgressionEntry] = Field(default_factory=list)


class ClassProgressionConfig(BaseModel):
    """Progression configuration for a single D&D class"""
    hiddenKeys: Optional[List[str]] = Field(default_factory=list)
    spellSlots: Optional[bool] = False
    progressionColumns: List[ProgressionColumn] = Field(default_factory=list)


class AllClassesProgressionConfig(BaseModel):
    """Container for all class progressions, keyed by class name"""
    class_name: str  # e.g., "barbarian", "bard"
    config: ClassProgressionConfig

    class Config:
        json_schema_extra = {
            "example": {
                "class_name": "barbarian",
                "config": {
                    "progressionColumns": [
                        {
                            "id": "rage-damage",
                            "label": "Rage Damage",
                            "source": "class_specific",
                            "key": "rage_damage_bonus",
                            "progression": [
                                {"level": 1, "value": "+2"},
                                {"level": 9, "value": "+3"},
                                {"level": 16, "value": "+4"}
                            ]
                        }
                    ]
                }
            }
        }
