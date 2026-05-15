"""
12_validate_generated_json.py — Validador de JSON generado por la IA.

La IA no debería ser la única responsable de la validez del JSON.
Este validador usa Pydantic para garantizar que el JSON generado
cumpla con la estructura esperada antes de enviarlo a la API.

Uso:
  from scripts.validate_generated_json import validate_weapon

  resultado = validate_weapon({"name": "Espada", ...})
  if resultado[0]:
      print("✅ Válido:", resultado[1])
  else:
      print("❌ Inválido:", resultado[1])


También se puede usar como script:
  python scripts/12_validate_generated_json.py
"""

from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List
import json


# ============================================================
# MODELOS DE VALIDACIÓN (Pydantic)
# ============================================================

class Damage(BaseModel):
    dice: str = Field(..., description="Dados de daño, ej: 1d8")
    type: str = Field(..., description="Tipo de daño, ej: slashing, fire")


class Cost(BaseModel):
    quantity: Optional[int] = None
    unit: str = ""


class Weapon(BaseModel):
    type: str = Field(pattern="^weapon$", description="Debe ser exactamente 'weapon'")
    name: str = Field(..., min_length=1, description="Nombre del arma")
    category: str = Field(..., description="Categoría del arma")
    rarity: str = Field(..., description="Rareza")
    damage: Damage
    extra_damage: Optional[Damage] = None
    properties: List[str] = []
    weight: Optional[float] = None
    cost: Optional[Cost] = None
    description: List[str] = []


class Armor(BaseModel):
    type: str = Field(pattern="^armor$")
    name: str = Field(..., min_length=1)
    armor_category: str = Field(..., description="light, medium o heavy")
    rarity: str = ""
    armor_class: dict = Field(..., description="CA base y modificadores")
    strength_minimum: Optional[int] = None
    stealth_disadvantage: bool = False
    weight: Optional[float] = None
    description: List[str] = []


class MagicItem(BaseModel):
    type: str = Field(pattern="^magicitem$")
    name: str = Field(..., min_length=1)
    rarity: str = ""
    description: List[str] = []
    properties: List[str] = []


# ============================================================
# FUNCIONES VALIDADORAS
# ============================================================

def validate_weapon(data: dict):
    """Valida que el diccionario sea un arma válida."""
    try:
        weapon = Weapon(**data)
        return True, weapon
    except ValidationError as e:
        return False, _format_errors(e)


def validate_armor(data: dict):
    """Valida que el diccionario sea una armadura válida."""
    try:
        armor = Armor(**data)
        return True, armor
    except ValidationError as e:
        return False, _format_errors(e)


def validate_magic_item(data: dict):
    """Valida que el diccionario sea un objeto mágico válido."""
    try:
        item = MagicItem(**data)
        return True, item
    except ValidationError as e:
        return False, _format_errors(e)


def validate_by_type(data: dict):
    """
    Valida automáticamente según el campo 'type' del JSON.

    Args:
        data: Diccionario con al menos campo "type"

    Returns:
        (True, objeto_validado) o (False, lista_de_errores)
    """
    type_validators = {
        "weapon": validate_weapon,
        "armor": validate_armor,
        "magicitem": validate_magic_item,
    }

    item_type = data.get("type", "")

    validator = type_validators.get(item_type)

    if validator is None:
        return False, [f"Tipo desconocido: '{item_type}'. Tipos soportados: {list(type_validators.keys())}"]

    return validator(data)


def _format_errors(error: ValidationError) -> list[str]:
    """Convierte errores de Pydantic en mensajes legibles."""
    messages = []

    for err in error.errors():
        field = " → ".join(str(loc) for loc in err["loc"])
        msg = err["msg"]
        messages.append(f"Campo '{field}': {msg}")

    return messages


# ============================================================
# EJEMPLO DE USO
# ============================================================

if __name__ == "__main__":
    print("=" * 50)
    print("VALIDACIÓN DE JSON GENERADO")
    print("=" * 50)

    # Ejemplo 1: JSON válido
    print("\n\n1. Probando JSON VÁLIDO:")
    valid_weapon = {
        "type": "weapon",
        "name": "Colmillo Solar",
        "category": "martial melee weapon",
        "rarity": "rare",
        "damage": {"dice": "1d8", "type": "slashing"},
        "extra_damage": {"dice": "1d6", "type": "fire"},
        "properties": ["versatile"],
        "weight": 3,
        "description": ["Una espada dorada con runas ardientes."],
    }

    is_valid, result = validate_weapon(valid_weapon)
    if is_valid:
        print(f"  ✅ Arma válida: {result.name}")
    else:
        print(f"  ❌ {result}")

    # Ejemplo 2: JSON inválido (falta category)
    print("\n\n2. Probando JSON INVÁLIDO (falta 'category'):")
    invalid_weapon = {
        "type": "weapon",
        "name": "Espada Rota",
        "damage": {"dice": "1d6", "type": "piercing"},
    }

    is_valid, result = validate_weapon(invalid_weapon)
    if is_valid:
        print(f"  ✅ Arma válida: {result.name}")
    else:
        print(f"  ❌ Errores encontrados:")
        for err in result:
            print(f"     - {err}")

    # Ejemplo 3: validación automática por tipo
    print("\n\n3. Validación automática por tipo:")
    is_valid, result = validate_by_type(valid_weapon)
    if is_valid:
        print(f"  ✅ Tipo detectado: {result.type} → {result.name}")
    else:
        print(f"  ❌ {result}")

    print("\n✅ Validador listo para usar.")
