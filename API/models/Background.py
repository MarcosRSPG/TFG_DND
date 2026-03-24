from pydantic import BaseModel, ConfigDict


class BackgroundSchema(BaseModel):
    id: str | None = None
    name: str
    starting_proficiencies: list[dict[f'index': str, f'name': str, f'url': str]] | None = None
    language_options: dict[f'choose': int, f'type': str, f'from': list[f'option_set_type': str, f'resource_list_url': str]] | None = None
    starting_equipment: list[dict[f'equipment': dict[f'index': str, f'name': str, f'url': str], f'quantity': int]] | None = None
    starting_equipment_options: dict[f'choose': int, f'type': str, f'from': list[f'option_set_type': str, f'equipment_category': dict[f'index': str, f'name': str, f'url': str]]] | None = None
    feature: dict[f'name': str, f'desc': list[str, str]] | None = None
    personality_traits: dict[f'choose': int, f'type': str, f'from': dict[f'option_set_type': str, f'options': list[dict[f'option_type': str, f'string': str]]]] | None = None
    ideals: dict[f'choose': int, f'type': str, f'from': dict[f'option_set_type': str, f'options': list[dict[f'option_type': str, f'desc': str, f'alignments': list[dict[f'index': str, f'name': str, f'url': str]]]]]] | None = None
    bonds: dict[f'choose': int, f'type': str, f'from': dict[f'option_set_type': str, f'options': list[dict[f'option_type': str, f'string': str]]]] | None = None
    flaws: dict[f'choose': int, f'type': str, f'from': dict[f'option_set_type': str, f'options': list[dict[f'option_type': str, f'string': str]]]] | None = None
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(extra='ignore')