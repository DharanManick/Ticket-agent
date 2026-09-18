from typing import List
from fastapi import APIRouter
from app.schemas.notification import NotificationDispatch, NotificationResult
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.post("/dispatch", response_model=List[NotificationResult])
async def dispatch_notification(payload: NotificationDispatch):
    """Dispatch notification across configured channels (email, teams, all)."""
    return await notification_service.dispatch(payload)
