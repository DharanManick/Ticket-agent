from typing import List, Optional, Dict, Any
from app.schemas.incident import IncidentCreate
from app.schemas.rule import AlertRuleSchema, CiMatrixRowSchema
from loguru import logger

class RuleEngineService:
    """
    Service handling Alert Rule evaluation and CI Matrix escalation routing.
    All rules, CI matrices, assignment groups, and keywords are dynamically managed
    and fetched from the API / database rather than hardcoded.
    """

    def __init__(self):
        self._active_rules: List[AlertRuleSchema] = []
        self._ci_matrix: List[CiMatrixRowSchema] = []

    def set_rules(self, rules: List[AlertRuleSchema]) -> None:
        """Dynamically update alert rules from API payload or database."""
        self._active_rules = rules
        logger.info(f"Loaded {len(rules)} dynamic alert rules from API configuration.")

    def set_ci_matrix(self, ci_matrix: List[CiMatrixRowSchema]) -> None:
        """Dynamically update CI matrix from API payload or database."""
        self._ci_matrix = ci_matrix
        logger.info(f"Loaded {len(ci_matrix)} dynamic CI matrix records from API configuration.")

    def evaluate_rules(self, incident: IncidentCreate, custom_rules: Optional[List[AlertRuleSchema]] = None) -> Optional[AlertRuleSchema]:
        rules_to_check = custom_rules if custom_rules is not None else self._active_rules
        if not rules_to_check:
            return None

        search_text = f"{incident.title} {incident.description}".lower()
        for rule in rules_to_check:
            if rule.is_active and rule.condition_keyword and rule.condition_keyword.lower() in search_text:
                logger.info(f"Incident matched dynamic alert rule: {rule.name} ({rule.id})")
                return rule
        return None

    def match_ci_matrix(self, ci_name: Optional[str], custom_matrix: Optional[List[CiMatrixRowSchema]] = None) -> Optional[CiMatrixRowSchema]:
        if not ci_name:
            return None
        matrix_to_check = custom_matrix if custom_matrix is not None else self._ci_matrix
        for row in matrix_to_check:
            if row.ci_name and row.ci_name.lower() == ci_name.lower():
                return row
        return None

rule_engine = RuleEngineService()
