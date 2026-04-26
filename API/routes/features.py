from fastapi import APIRouter, HTTPException
from services.local_catalog_repository import get_all as get_all_docs, get_by_id as repo_get_by_id, get_by_index as get_by_index_repo

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
    features = await get_all_docs("features")
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
    # Try by _id first
    result = await repo_get_by_id("features", feature_id)
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await get_by_index_repo("features", feature_id)
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Feature not found"})
    
    return doc_to_response(result)