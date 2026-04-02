from fastapi import APIRouter, HTTPException, Body, Depends
from services import monsters_service
from services.authorization_service import require_write_authorization
from models.Monster import Monster
from pydantic import ValidationError

router = APIRouter(prefix="/monsters", tags=["monsters"])


@router.get("/")
async def get_monsters() -> list:
    """Get all monsters, optionally filtered by criteria"""
    monsters = monsters_service.get_all()
    return monsters


@router.get("/{monster_id}")
async def get_monster(monster_id: str) -> dict:
    """Get a specific monster by ID/index"""
    monster = monsters_service.get_by_id(monster_id)
    if not monster:
        raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")
    return monster


@router.post("/", status_code=201)
async def create_monster(monster: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    """Create a new monster (requires Authorization header with valid access token)"""
    try:
        return monsters_service.create(monster)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{monster_id}")
async def update_monster(monster_id: str, monster: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    """Update an existing monster (requires Authorization header with valid access token)"""
    try:
        # Verify monster exists
        existing = monsters_service.get_by_id(monster_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")
        
        return monsters_service.update(monster_id, monster)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{monster_id}", status_code=204)
async def delete_monster(monster_id: str, current_user: dict = Depends(require_write_authorization)):
    """Delete a monster (requires Authorization header with valid access token)"""
    success = monsters_service.delete(monster_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")
    return None
