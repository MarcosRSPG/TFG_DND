from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import get_db

router = APIRouter(prefix="/subclasses", tags=["subclasses"])


def doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to API response with id field"""
    if doc is None:
        return None
    
    response = {k: v for k, v in doc.items() if k != '_id'}
    response['id'] = str(doc.get('_id', ''))
    return response


@router.get("")
async def get_subclasses():
    """Get all subclasses"""
    db = await get_db()
    subclasses = await db["subclasses"].find({}).to_list(length=None)
    results = [
        {
            "id": str(sc.get("_id", "")),
            "name": sc.get("name"),
            "url": sc.get("url")
        }
        for sc in subclasses
        if sc.get("name")
    ]
    return {
        "count": len(results),
        "results": results
    }


@router.get("/{subclass_id}")
async def get_subclass_by_id(subclass_id: str):
    """Get a subclass by its _id"""
    db = await get_db()
    result = None
    
    # Try by _id first
    if ObjectId.is_valid(subclass_id):
        result = await db["subclasses"].find_one({"_id": ObjectId(subclass_id)})
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await db["subclasses"].find_one({"index": subclass_id})
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Subclass not found"})
    
    return doc_to_response(result)
