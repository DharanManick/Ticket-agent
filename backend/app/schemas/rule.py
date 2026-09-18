from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AlertRuleSchema(BaseModel):
    id: str
    name: str
    condition_keyword: str
    target_severity: str
    action_type: str
    escalation_timeout_mins: int = 30
    is_active: bool = True

class CiMatrixRowSchema(BaseModel):
    id: str
    ci_name: str
    tier: str
    primary_owner: str
    manager_owner: str
    escalation_path: List[str]
