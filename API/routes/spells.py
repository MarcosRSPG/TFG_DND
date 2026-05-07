from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from services import spells_service
from services.auth_service import get_current_user
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
async def update_spell(spell_id: str, request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    try:
        spell_data = await parse_form_or_json(request, "spells")
        print(f"[UPDATE SPELL] {spell_id} — incoming keys: {list(spell_data.keys())}")
        existing = await spells_service.get_by_id(spell_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")

        return await spells_service.update(spell_id, spell_data)
    except ValidationError as e:
        error_detail = e.json()
        print(f"[UPDATE SPELL VALIDATION ERROR] {spell_id}: {error_detail}")
        raise HTTPException(status_code=422, detail=error_detail)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPDATE SPELL ERROR] {spell_id}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{spell_id}", status_code=204)
async def delete_spell(spell_id: str, current_user: dict = Depends(get_current_user)):
    success = await spells_service.delete(spell_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return None
