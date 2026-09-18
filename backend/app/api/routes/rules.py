from typing import List
from fastapi import APIRouter
from app.schemas.rule import AlertRuleSchema, CiMatrixRowSchema
from app.services.rule_engine import DEFAULT_RULES, DEFAULT_CI_MATRIX

router = APIRouter(prefix="/rules", tags=["Alert Rules & CI Matrix"])

@router.get("/alert-rules", response_model=List[AlertRuleSchema])
async def get_alert_rules():
    """Retrieve active alert rules."""
    return DEFAULT_RULES

@router.get("/ci-matrix", response_model=List[CiMatrixRowSchema])
async def get_ci_matrix():
    """Retrieve CI escalation matrix."""
    return DEFAULT_CI_MATRIX
