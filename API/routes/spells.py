from fastapi import APIRouter, HTTPException, Body, Request
from pydantic import ValidationError
from services import spells_service
from models.Spell import Spell
from utils.image_utils import parse_form_or_json

router = APIRouter(prefix="/spells", tags=["spells"])


@router.get("/")
async def get_spells() -> list:
    return await spells_service.get_all()


@router.get("/{spell_id}")
async def get_spell(spell_id: str) -> dict:
    spell = await spells_service.get_by_id(spell_id)
    if not spell:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return spell


@router.post("", status_code=201)
async def create_spell(request: Request) -> dict:
    try:
        spell_data = await parse_form_or_json(request, "spells")
        return await spells_service.create(spell_data)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{spell_id}")
async def update_spell(spell_id: str, spell: dict = Body(...)) -> dict:
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
async def delete_spell(spell_id: str):
    success = await spells_service.delete(spell_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return None
