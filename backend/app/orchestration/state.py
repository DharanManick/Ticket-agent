from typing import Optional, List, Dict, Any, TypedDict
from app.schemas.incident import IncidentCreate, IncidentSchema
from app.schemas.evaluation import AIEvaluationResult
from app.schemas.rule import AlertRuleSchema, CiMatrixRowSchema

class IncidentProcessingState(TypedDict):
    """LangGraph state object representing pipeline context through pipeline stages."""
    incident: IncidentCreate
    incident_id: Optional[str]
    vector_context: List[str]
    matched_rule: Optional[AlertRuleSchema]
    ci_matrix: Optional[CiMatrixRowSchema]
    ai_evaluation: Optional[AIEvaluationResult]
    final_incident: Optional[IncidentSchema]
    notifications_sent: List[Dict[str, Any]]
    error: Optional[str]
