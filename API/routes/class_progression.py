from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/class-progression", tags=["class-progression"])

from services import class_progression_service


@router.get("")
async def get_all_progression_configs():
    """Get all class progression configurations"""
    try:
        configs = await class_progression_service.get_all_progression_configs()
        return {
            "count": len(configs),
            "results": configs
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving configs: {exc}") from exc


@router.get("/{class_name}")
async def get_progression_by_class(class_name: str):
    """Get progression configuration for a specific class"""
    try:
        config = await class_progression_service.get_progression_by_class(class_name)
        if config is None:
            raise HTTPException(status_code=404, detail=f"Progression config for class '{class_name}' not found")
        return config
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving config: {exc}") from exc


@router.post("/{class_name}")
async def create_or_update_progression(class_name: str, config_data: Dict[str, Any]):
    """Create or update progression configuration for a class"""
    try:
        result = await class_progression_service.create_or_update_progression(class_name, config_data)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error saving config: {exc}") from exc


@router.delete("/{class_name}")
async def delete_progression(class_name: str):
    """Delete progression configuration for a class"""
    try:
        deleted = await class_progression_service.delete_progression(class_name)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Progression config for class '{class_name}' not found")
        return {"message": f"Progression config for class '{class_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error deleting config: {exc}") from exc
