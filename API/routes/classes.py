from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import get_db

router = APIRouter(prefix="/classes", tags=["classes"])


def doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to API response with id field"""
    if doc is None:
        return None
    
    response = {k: v for k, v in doc.items() if k != '_id'}
    response['id'] = str(doc.get('_id', ''))
    return response


@router.get("")
async def get_classes():
    """Get all classes"""
    db = await get_db()
    classes = await db["classes"].find({}).to_list(length=None)
    results = []
    for cls in classes:
        cls_id = str(cls.get("_id", "")) if cls.get("_id") else ""
        results.append({
            "id": cls_id,
            "name": cls.get("name"),
            "url": cls.get("url")
        })
    return {
        "count": len(results),
        "results": results
    }


@router.get("/{class_id}")
async def get_class_by_id(class_id: str):
    """Get a class by its _id"""
    db = await get_db()
    result = None
    
    # Try by _id first
    if ObjectId.is_valid(class_id):
        result = await db["classes"].find_one({"_id": ObjectId(class_id)})
    
    if result is None:
        # Fallback: try by index for backwards compatibility
        result = await db["classes"].find_one({"index": class_id})
    
    if result is None:
        raise HTTPException(status_code=404, content={"detail": "Class not found"})
    
    return doc_to_response(result)


@router.get("/{class_id}/levels")
async def get_class_levels(class_id: str):
    """Get all levels for a class"""
    db = await get_db()
    # Check if class exists
    class_data = None
    if ObjectId.is_valid(class_id):
        class_data = await db["classes"].find_one({"_id": ObjectId(class_id)})
    if class_data is None:
        class_data = await db["classes"].find_one({"index": class_id})
    
    if class_data is None:
        raise HTTPException(status_code=404, content={"detail": "Class not found"})
    
    # Get all levels for this class - stored in class_levels collection
    try:
        levels = await db["class_levels"].find({}).to_list(length=None)
        # Find the class index to match levels
        class_index = class_data.get("index")
        class_levels = [level for level in levels if level.get("class") == class_index]
        
        if class_levels:
            # Sort by level and add id to each
            class_levels.sort(key=lambda x: x.get("level", 0))
            return [
                {k: v for k, v in level.items() if k != '_id'}
                for level in class_levels
            ]
    except Exception:
        pass
    
    return []


# Subclasses routes under /classes
@router.get("/subclasses")
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


@router.get("/subclasses/{subclass_id}")
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


@router.get("/subclasses/{subclass_id}/levels")
async def get_subclass_levels(subclass_id: str):
    """Get all levels for a subclass"""
    db = await get_db()
    # Check if subclass exists
    subclass_data = None
    if ObjectId.is_valid(subclass_id):
        subclass_data = await db["subclasses"].find_one({"_id": ObjectId(subclass_id)})
    if subclass_data is None:
        subclass_data = await db["subclasses"].find_one({"index": subclass_id})
    
    if subclass_data is None:
        raise HTTPException(status_code=404, content={"detail": "Subclass not found"})
    
    # Get all levels for this subclass - stored in subclass_levels collection
    try:
        levels = await db["subclass_levels"].find({}).to_list(length=None)
        # Find the subclass index to match levels
        subclass_index = subclass_data.get("index")
        subclass_levels = [level for level in levels if level.get("subclass") == subclass_index]
        
        if subclass_levels:
            # Sort by level and add id to each
            subclass_levels.sort(key=lambda x: x.get("level", 0))
            return [
                {k: v for k, v in level.items() if k != '_id'}
                for level in subclass_levels
            ]
    except Exception:
        pass
    
    return []