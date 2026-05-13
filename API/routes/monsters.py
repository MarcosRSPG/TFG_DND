from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from services import monsters_service
from services.auth_service import get_current_user, optional_get_current_user
from models.Monster import Monster
from utils.image_utils import parse_form_or_json

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


@router.post("", status_code=201)
async def create_monster(request: Request, current_user: dict = Depends(optional_get_current_user)) -> dict:
    try:
        monster_data = await parse_form_or_json(request, "monsters")
        if current_user and not monster_data.get("created_by"):
            monster_data["created_by"] = current_user.get("user_id")
        return await monsters_service.create(monster_data)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{monster_id}")
async def update_monster(monster_id: str, request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    try:
        monster_data = await parse_form_or_json(request, "monsters")
        existing = await monsters_service.get_by_id(monster_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")

        return await monsters_service.update(monster_id, monster_data)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{monster_id}", status_code=204)
async def delete_monster(monster_id: str, current_user: dict = Depends(get_current_user)):
    success = await monsters_service.delete(monster_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Monster '{monster_id}' not found")
    return None
