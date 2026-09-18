from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class NotificationDispatch(BaseModel):
    incident_id: str
    channel: str = Field(description="teams, email, or all")
    recipient: str
    subject: Optional[str] = None
    message_body: str
    metadata: Optional[Dict[str, Any]] = None

class NotificationResult(BaseModel):
    success: bool
    channel: str
    recipient: str
    message: str
    timestamp: str
