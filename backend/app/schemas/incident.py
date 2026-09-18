from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class IncidentBase(BaseModel):
    title: str
    description: str
    source: str
    severity: str = Field(default="Medium", description="Severity level: Low, Medium, High, Critical")
    ci_name: Optional[str] = None
    assignee_email: Optional[str] = None
    manager_email: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    ci_name: Optional[str] = None
    assignee_email: Optional[str] = None
    manager_email: Optional[str] = None

class IncidentSchema(IncidentBase):
    id: str
    status: str = "Open"
    created_at: datetime
    updated_at: datetime
    ai_summary: Optional[str] = None
    ai_recommended_action: Optional[str] = None
    matched_rule_id: Optional[str] = None
    escalation_level: int = 1

    class Config:
        from_attributes = True
