from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import get_db

router = APIRouter(prefix="/features", tags=["features"])


def doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to API response with id field"""
    if doc is None:
        return None
    
    response = {k: v for k, v in doc.items() if k != '_id'}
    response['id'] = str(doc.get('_id', ''))
    return response


@router.get("")
async def get_features():
    """Get all features"""
    db = await get_db()
    features = await db["features"].find({}).to_list(length=None)
    results = []
    for feature in features:
        feature_id = str(feature.get("_id", "")) if feature.get("_id") else ""
        results.append({
            "id": feature_id,
            "name": feature.get("name"),
            "url": feature.get("url")
        })
    return {
        "count": len(results),
        "results": results
    }


@router.get("/{feature_id}")
async def get_feature_by_id(feature_id: str):
    """Get a feature by its _id"""
    db = await get_db()
    result = None
    
    # Try by _id first
    if ObjectId.is_valid(feature_id):
        result = await db["features"].find_one({"_id": ObjectId(feature_id)})
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await db["features"].find_one({"index": feature_id})
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Feature not found"})
    
    return doc_to_response(result)