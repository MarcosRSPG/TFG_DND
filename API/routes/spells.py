from fastapi import APIRouter, HTTPException, Body, Depends
from services import spells_service
from services.authorization_service import require_write_authorization
from models.Spell import Spell
from pydantic import ValidationError

router = APIRouter(prefix="/spells", tags=["spells"])


@router.get("/")
async def get_spells(page: int = 1, page_size: int = 20) -> list:
    return await spells_service.get_all(page=page, page_size=page_size)


@router.get("/{spell_id}")
async def get_spell(spell_id: str) -> dict:
    spell = await spells_service.get_by_id(spell_id)
    if not spell:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return spell


@router.post("/", status_code=201)
async def create_spell(spell: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    try:
        return await spells_service.create(spell)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{spell_id}")
async def update_spell(spell_id: str, spell: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    try:
        existing = await spells_service.get_by_id(spell_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")

        return await spells_service.update(spell_id, spell)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{spell_id}", status_code=204)
async def delete_spell(spell_id: str, current_user: dict = Depends(require_write_authorization)):
    success = await spells_service.delete(spell_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return None