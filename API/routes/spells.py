from fastapi import APIRouter, HTTPException, Body, Depends
from services import spells_service
from services.authorization_service import require_write_authorization
from models.Spell import Spell
from pydantic import ValidationError

router = APIRouter(prefix="/spells", tags=["spells"])


@router.get("/")
async def get_spells() -> list:
    """Get all spells, optionally filtered by criteria"""
    spells = spells_service.get_all()
    return spells


@router.get("/{spell_id}")
async def get_spell(spell_id: str) -> dict:
    """Get a specific spell by ID/index"""
    spell = spells_service.get_by_id(spell_id)
    if not spell:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return spell


@router.post("/", status_code=201)
async def create_spell(spell: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    """Create a new spell (requires Authorization header with valid access token)"""
    try:
        return spells_service.create(spell)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{spell_id}")
async def update_spell(spell_id: str, spell: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    """Update an existing spell (requires Authorization header with valid access token)"""
    try:
        # Verify spell exists
        existing = spells_service.get_by_id(spell_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
        
        return spells_service.update(spell_id, spell)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{spell_id}", status_code=204)
async def delete_spell(spell_id: str, current_user: dict = Depends(require_write_authorization)):
    """Delete a spell (requires Authorization header with valid access token)"""
    success = spells_service.delete(spell_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Spell '{spell_id}' not found")
    return None
