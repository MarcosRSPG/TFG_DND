from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import get_db

router = APIRouter(prefix="/races", tags=["races"])


def doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to API response with id field"""
    if doc is None:
        return None
    
    response = {k: v for k, v in doc.items() if k != '_id'}
    response['id'] = str(doc.get('_id', ''))
    return response


@router.get("")
async def get_races():
    """Get all races"""
    db = await get_db()
    races = await db["races"].find({}).to_list(length=None)
    results = []
    for race in races:
        race_id = str(race.get("_id", "")) if race.get("_id") else ""
        results.append({
            "id": race_id,
            "name": race.get("name"),
            "url": race.get("url")
        })
    return {
        "count": len(results),
        "results": results
    }


@router.get("/{race_id}")
async def get_race_by_id(race_id: str):
    """Get a race by its _id"""
    db = await get_db()
    result = None
    
    # Try by _id first
    if ObjectId.is_valid(race_id):
        result = await db["races"].find_one({"_id": ObjectId(race_id)})
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await db["races"].find_one({"index": race_id})
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Race not found"})
    
    return doc_to_response(result)