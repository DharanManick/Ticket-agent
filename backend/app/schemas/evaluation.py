from typing import List, Optional
from pydantic import BaseModel, Field

class AIEvaluationResult(BaseModel):
    summary: str = Field(description="Executive summary of the incident")
    predicted_severity: str = Field(description="Predicted severity (Low, Medium, High, Critical)")
    root_cause_hypothesis: str = Field(description="Hypothesized root cause")
    recommended_action: str = Field(description="Actionable remediation steps")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    tags: List[str] = Field(default_factory=list, description="Extracted category tags")

class EscalationRecommendation(BaseModel):
    should_escalate: bool = Field(description="Whether immediate escalation is needed")
    next_level: int = Field(description="Recommended escalation level (1, 2, 3)")
    target_role: str = Field(description="Target role or team for escalation")
    reasoning: str = Field(description="Reasoning behind escalation decision")
