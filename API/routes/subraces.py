from fastapi import APIRouter, HTTPException
from services.local_catalog_repository import get_all as get_all_docs, get_by_id as repo_get_by_id, get_by_index as get_by_index_repo

router = APIRouter(prefix="/subraces", tags=["subraces"])


def doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to API response with id field"""
    if doc is None:
        return None
    
    response = {k: v for k, v in doc.items() if k != '_id'}
    response['id'] = str(doc.get('_id', ''))
    return response


@router.get("")
async def get_subraces():
    """Get all subraces"""
    subraces = await get_all_docs("subraces")
    results = []
    for sr in subraces:
        sr_id = str(sr.get("_id", "")) if sr.get("_id") else ""
        results.append({
            "id": sr_id,
            "name": sr.get("name"),
            "url": sr.get("url")
        })
    return {
        "count": len(results),
        "results": results
    }


@router.get("/{subrace_id}")
async def get_subrace_by_id(subrace_id: str):
    """Get a subrace by its _id"""
    # Try by _id first
    result = await repo_get_by_id("subraces", subrace_id)
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await get_by_index_repo("subraces", subrace_id)
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Subrace not found"})
    
    return doc_to_response(result)