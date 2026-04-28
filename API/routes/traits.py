from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import get_db

router = APIRouter(prefix="/traits", tags=["traits"])


def doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to API response with id field"""
    if doc is None:
        return None
    
    response = {k: v for k, v in doc.items() if k != '_id'}
    response['id'] = str(doc.get('_id', ''))
    return response


@router.get("")
async def get_traits():
    """Get all traits"""
    db = await get_db()
    traits = await db["traits"].find({}).to_list(length=None)
    results = []
    for trait in traits:
        trait_id = str(trait.get("_id", "")) if trait.get("_id") else ""
        results.append({
            "id": trait_id,
            "name": trait.get("name"),
            "url": trait.get("url")
        })
    return {
        "count": len(results),
        "results": results
    }


@router.get("/{trait_id}")
async def get_trait_by_id(trait_id: str):
    """Get a trait by its _id"""
    db = await get_db()
    result = None
    
    # Try by _id first
    if ObjectId.is_valid(trait_id):
        result = await db["traits"].find_one({"_id": ObjectId(trait_id)})
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await db["traits"].find_one({"index": trait_id})
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Trait not found"})
    
    return doc_to_response(result)