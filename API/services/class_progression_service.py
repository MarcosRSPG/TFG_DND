from typing import Any, List, Dict, Optional
from bson import ObjectId
from fastapi import HTTPException
from db import get_db


def _to_progression_entry(doc: dict) -> dict:
    """Convert MongoDB document to progression config format"""
    if not doc:
        return {}
    
    # Remove MongoDB _id and convert to response format
    result = {k: v for k, v in doc.items() if k != '_id'}
    
    # Ensure class_name is used as identifier
    if 'class_name' in result:
        result['className'] = result.pop('class_name')
    
    return result


async def get_all_progression_configs() -> List[Dict[str, Any]]:
    """Get all class progression configurations from database"""
    try:
        db = await get_db()
        collection = db["class_progression_config"]
        docs = await collection.find({}).to_list(length=None)
        # Convert to list with className as a field (for the API response)
        result = []
        for doc in docs:
            entry = _to_progression_entry(doc)
            # Rename 'class_name' to 'className' for frontend compatibility
            if 'class_name' in entry:
                entry['className'] = entry.pop('class_name')
            result.append(entry)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving progression configs: {exc}") from exc


async def get_progression_by_class(class_name: str) -> Optional[Dict[str, Any]]:
    """Get progression configuration for a specific class"""
    try:
        db = await get_db()
        collection = db["class_progression_config"]
        doc = await collection.find_one({"class_name": class_name})
        if doc:
            return _to_progression_entry(doc)
        return None
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving progression for {class_name}: {exc}") from exc


async def create_or_update_progression(class_name: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update progression configuration for a class"""
    try:
        db = await get_db()
        collection = db["class_progression_config"]
        
        # Prepare document
        doc = dict(config_data)
        doc['class_name'] = class_name
        doc.pop('_id', None)  # Remove _id if present
        
        # Upsert: update if exists, insert if not
        result = await collection.update_one(
            {"class_name": class_name},
            {"$set": doc},
            upsert=True
        )
        
        # Return the updated/created document
        updated = await collection.find_one({"class_name": class_name})
        return _to_progression_entry(updated) if updated else doc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error saving progression config: {exc}") from exc


async def delete_progression(class_name: str) -> bool:
    """Delete progression configuration for a class"""
    try:
        db = await get_db()
        collection = db["class_progression_config"]
        result = await collection.delete_one({"class_name": class_name})
        return result.deleted_count > 0
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error deleting progression config: {exc}") from exc
