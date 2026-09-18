from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger
from app.services.user_service import user_service

router = APIRouter(prefix="", tags=["User Profile"])

class ProfileUpdateRequest(BaseModel):
    theme: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

@router.get("/user/profile")
@router.get("/api/user/profile")
async def get_user_profile():
    """Retrieve persistent user profile including theme preference."""
    logger.info("HTTP GET /api/user/profile requested")
    return {
        "success": True,
        "profile": user_service.get_profile()
    }

@router.post("/user/profile")
@router.post("/api/user/profile")
@router.post("/user/preferences")
@router.post("/api/user/preferences")
async def update_user_profile(req: ProfileUpdateRequest):
    """Update persistent user profile and device theme preference."""
    logger.info(f"HTTP POST /api/user/profile received | theme: {req.theme}")
    updated = user_service.update_profile(
        theme=req.theme,
        name=req.name,
        role=req.role,
        preferences=req.preferences
    )
    return {
        "success": True,
        "message": "User profile and theme preferences updated successfully.",
        "profile": updated
    }
