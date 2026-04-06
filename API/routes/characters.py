import fastapi
from fastapi import Depends

from models.Character import CharacterSchema
from services import characters_service
from services.authorization_service import require_write_authorization


router = fastapi.APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model_exclude_none=True)
def get_characters() -> list[dict]:
    return characters_service.get_all()


@router.get("/{character_id}", response_model_exclude_none=True)
def get_character(character_id: str) -> dict:
    return characters_service.get_by_id(character_id)


@router.post("", response_model_exclude_none=True)
def create_character(
    character: CharacterSchema,
    current_user: dict = Depends(require_write_authorization),
) -> dict:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return characters_service.create(character.model_dump(exclude_none=True, by_alias=True), actor_id)


@router.put("/{character_id}", response_model_exclude_none=True)
def update_character(
    character_id: str,
    character: CharacterSchema,
    current_user: dict = Depends(require_write_authorization),
) -> dict:
    actor_id = current_user.get("user_id") or current_user.get("_id") or current_user.get("email")
    return characters_service.update(character_id, character.model_dump(exclude_none=True, by_alias=True), actor_id)


@router.delete("/{character_id}", status_code=204)
def delete_character(character_id: str, current_user: dict = Depends(require_write_authorization)):
    success = characters_service.delete(character_id)
    if not success:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Character not found")
    return None