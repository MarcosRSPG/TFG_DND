from fastapi import APIRouter, HTTPException, Body, Depends
from services import monsters_service
from services.authorization_service import require_write_authorization
from models.Monster import Monster
from pydantic import ValidationError

router = APIRouter(prefix="/monsters", tags=["monsters"])


@router.get("/")
async def get_monsters() -> list:
    return await monsters_service.get_all()


@router.get("/{monster_id}")
async def get_monster(monster_id: str) -> dict:
    monster = await monsters_service.get_by_id(monster_id)
    if not monster:
        raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")
    return monster


@router.post("/", status_code=201)
async def create_monster(monster: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    try:
        return await monsters_service.create(monster)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{monster_id}")
async def update_monster(monster_id: str, monster: dict = Body(...), current_user: dict = Depends(require_write_authorization)) -> dict:
    try:
        existing = await monsters_service.get_by_id(monster_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")

        return await monsters_service.update(monster_id, monster)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{monster_id}", status_code=204)
async def delete_monster(monster_id: str, current_user: dict = Depends(require_write_authorization)):
    success = await monsters_service.delete(monster_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")
    return None