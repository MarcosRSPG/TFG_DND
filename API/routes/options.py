from fastapi import APIRouter
from db import get_db

router = APIRouter(prefix="/options", tags=["options"])


@router.get("/proficiencies")
async def get_proficiencies():
    db = await get_db()
    return await db["proficiencies"].find({}).to_list(length=None)


@router.get("/proficiencies/{prof_id}")
async def get_proficiency(prof_id: str):
    db = await get_db()
    return await db["proficiencies"].find_one({"index": prof_id})


@router.get("/magic-schools")
async def get_magic_schools():
    db = await get_db()
    return await db["magic-schools"].find({}).to_list(length=None)


@router.get("/alignments")
async def get_alignments():
    db = await get_db()
    return await db["alignments"].find({}).to_list(length=None)


@router.get("/alignments/{align_id}")
async def get_alignment(align_id: str):
    db = await get_db()
    return await db["alignments"].find_one({"index": align_id})


@router.get("/equipment-categories")
async def get_equipment_categories():
    db = await get_db()
    return await db["equipment-categories"].find({}).to_list(length=None)


@router.get("/languages")
async def get_languages():
    db = await get_db()
    return await db["languages"].find({}).to_list(length=None)


@router.get("/conditions")
async def get_conditions():
    db = await get_db()
    return await db["conditions"].find({}).to_list(length=None)


@router.get("/damage-types")
async def get_damage_types():
    db = await get_db()
    return await db["damage-types"].find({}).to_list(length=None)


@router.get("/weapon-properties")
async def get_weapon_properties():
    db = await get_db()
    return await db["weapon-properties"].find({}).to_list(length=None)


@router.get("/ability-scores")
async def get_ability_scores():
    db = await get_db()
    return await db["ability-scores"].find({}).to_list(length=None)


@router.get("/traits")
async def get_traits():
    db = await get_db()
    return await db["traits"].find({}).to_list(length=None)


@router.get("/skills")
async def get_skills():
    db = await get_db()
    return await db["skills"].find({}).to_list(length=None)