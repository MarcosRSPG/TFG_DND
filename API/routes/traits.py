from fastapi import APIRouter, HTTPException
from services.local_catalog_repository import get_all as get_all_docs, get_by_id as repo_get_by_id, get_by_index as get_by_index_repo

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
    traits = await get_all_docs("traits")
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
    # Try by _id first
    result = await repo_get_by_id("traits", trait_id)
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await get_by_index_repo("traits", trait_id)
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Trait not found"})
    
    return doc_to_response(result)