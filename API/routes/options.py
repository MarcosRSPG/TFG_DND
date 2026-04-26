from fastapi import APIRouter
from services import local_catalog_repository

router = APIRouter(prefix="/options", tags=["options"])


@router.get("/proficiencies")
async def get_proficiencies():
    return await local_catalog_repository.get_all("proficiencies")


@router.get("/proficiencies/{prof_id}")
async def get_proficiency(prof_id: str):
    return await local_catalog_repository.get_by_index("proficiencies", prof_id)


@router.get("/magic-schools")
async def get_magic_schools():
    return await local_catalog_repository.get_all("magic-schools")


@router.get("/alignments")
async def get_alignments():
    return await local_catalog_repository.get_all("alignments")


@router.get("/alignments/{align_id}")
async def get_alignment(align_id: str):
    return await local_catalog_repository.get_by_index("alignments", align_id)


@router.get("/equipment-categories")
async def get_equipment_categories():
    return await local_catalog_repository.get_all("equipment-categories")


@router.get("/languages")
async def get_languages():
    return await local_catalog_repository.get_all("languages")


@router.get("/conditions")
async def get_conditions():
    return await local_catalog_repository.get_all("conditions")


@router.get("/damage-types")
async def get_damage_types():
    return await local_catalog_repository.get_all("damage-types")


@router.get("/weapon-properties")
async def get_weapon_properties():
    return await local_catalog_repository.get_all("weapon-properties")


@router.get("/ability-scores")
async def get_ability_scores():
    return await local_catalog_repository.get_all("ability-scores")


@router.get("/traits")
async def get_traits():
    return await local_catalog_repository.get_all("traits")


@router.get("/skills")
async def get_skills():
    return await local_catalog_repository.get_all("skills")