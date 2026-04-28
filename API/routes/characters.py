import fastapi

from models.Character import CharacterSchema
from services import characters_service


router = fastapi.APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model_exclude_none=True)
async def get_characters() -> list[dict]:
    return await characters_service.get_all()


@router.get("/{character_id}", response_model_exclude_none=True)
async def get_character(character_id: str) -> dict:
    return await characters_service.get_by_id(character_id)


@router.post("", response_model_exclude_none=True)
async def create_character(
    character: CharacterSchema,
) -> dict:
    return await characters_service.create(character.model_dump(exclude_none=True, by_alias=True))


@router.put("/{character_id}", response_model_exclude_none=True)
async def update_character(
    character_id: str,
    character: CharacterSchema,
) -> dict:
    return await characters_service.update(character_id, character.model_dump(exclude_none=True, by_alias=True))


@router.delete("/{character_id}", status_code=204)
async def delete_character(character_id: str):
    success = await characters_service.delete(character_id)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Character not found")
    return None