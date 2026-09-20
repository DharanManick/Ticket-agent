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

class CriterionAudit(BaseModel):
    criterion_name: str = Field(description="Name of the audited ITIL quality criterion")
    score: float = Field(ge=0.0, description="Earned score points")
    max_score: float = Field(gt=0.0, description="Maximum possible points for this criterion")
    is_compliant: bool = Field(description="Whether this criterion complies with ITIL and enterprise standards")
    rationale: str = Field(description="Contextual engineering evaluation explaining the quality score")
    infraction_detail: Optional[str] = Field(default=None, description="Detailed explanation of breach if non-compliant")
    remediation_guidance: Optional[str] = Field(default=None, description="Actionable correction guidance for the engineer")

class IncidentAdaptiveAuditResult(BaseModel):
    executive_summary: str = Field(description="Executive summary of the ticket quality and documentation posture")
    criteria: List[CriterionAudit] = Field(description="Individual audited criteria evaluations")
    quality_percentage: float = Field(ge=0.0, le=100.0, description="Overall compliance quality percentage (0-100)")
    infractions: List[str] = Field(default_factory=list, description="List of identified compliance infractions")
    proactive_recommendations: List[str] = Field(default_factory=list, description="List of proactive preventative recommendations")
    empathetic_remediation_draft: str = Field(description="Empathetic, constructive coaching comment for the assigned engineer")
