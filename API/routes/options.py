from fastapi import APIRouter
from db import get_db

router = APIRouter(tags=["options"])

_NO_ID = {"_id": 0}


async def _list(collection: str) -> dict:
    db = await get_db()
    results = await db[collection].find({}, _NO_ID).to_list(length=None)
    return {"results": results}


async def _one(collection: str, index: str) -> dict | None:
    db = await get_db()
    return await db[collection].find_one({"index": index}, _NO_ID)


@router.get("/proficiencies")
async def get_proficiencies():
    return await _list("proficiencies")


@router.get("/proficiencies/{prof_id}")
async def get_proficiency(prof_id: str):
    return await _one("proficiencies", prof_id)


@router.get("/magic-schools")
async def get_magic_schools():
    return await _list("magic-schools")


@router.get("/alignments")
async def get_alignments():
    return await _list("alignments")


@router.get("/alignments/{align_id}")
async def get_alignment(align_id: str):
    return await _one("alignments", align_id)


@router.get("/equipment-categories")
async def get_equipment_categories():
    return await _list("equipment-categories")


@router.get("/languages")
async def get_languages():
    return await _list("languages")


@router.get("/conditions")
async def get_conditions():
    return await _list("conditions")


@router.get("/damage-types")
async def get_damage_types():
    return await _list("damage-types")


@router.get("/weapon-properties")
async def get_weapon_properties():
    return await _list("weapon-properties")


@router.get("/ability-scores")
async def get_ability_scores():
    return await _list("ability-scores")


@router.get("/traits")
async def get_traits():
    return await _list("traits")


@router.get("/skills")
async def get_skills():
    return await _list("skills")