import asyncio
import time
from typing import List, Dict, Any, Optional
from loguru import logger
from app.llm.gemini import GeminiLLMProvider
from app.schemas.evaluation import IncidentAdaptiveAuditResult, CriterionAudit
from app.config import settings

SYSTEM_AUDITOR_INSTRUCTION = (
    "You are a Senior Enterprise ITIL & ServiceNow Quality Compliance Auditor. "
    "Perform a rigorous, objective evaluation of the provided ServiceNow incident ticket. "
    "Evaluate criteria including: "
    "1) Short Description Quality (conciseness, impacted service identification, symptom clarity), "
    "2) Technical Diagnostic Depth (logs, error codes, reproduction details, troubleshooting steps), "
    "3) Root Cause Analysis & Fix Verification (clear root cause explanation and fix validation), "
    "4) Customer Empathy & Professional Resolution (clarity, lack of internal jargon, professional tone). "
    "For each criterion, provide an auditable rationale explaining the score and any compliance infractions."
)

class AuditService:
    """Service handling incident compliance auditing, LLM evaluation, and progress state with Loguru tracing."""

    def __init__(self):
        self.processed_reports_cache: List[Dict[str, Any]] = []
        self.audit_progress: Dict[str, Any] = {
            "active": False,
            "total": 0,
            "completed": 0,
            "currentTicketId": "Idle"
        }
        self.llm_provider = GeminiLLMProvider()

    def get_reports(self) -> List[Dict[str, Any]]:
        logger.debug(f"[Audit Cache] Returning {len(self.processed_reports_cache)} cached audit reports.")
        return self.processed_reports_cache

    def get_progress(self) -> Dict[str, Any]:
        return self.audit_progress

    async def execute_audit(
        self,
        tickets: List[Dict[str, Any]],
        rules: Optional[List[Dict[str, Any]]] = None,
        ci_combinations: Optional[List[Dict[str, Any]]] = None,
        resolution_questions: Optional[List[Dict[str, Any]]] = None,
        overall_rules: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """Run compliance audit sweep over incidents with trace-friendly Loguru logging."""
        start_time = time.time()
        total_tickets = len(tickets)

        self.audit_progress = {
            "active": True,
            "total": total_tickets,
            "completed": 0,
            "currentTicketId": "Initializing audit sweep..."
        }

        audit_logger = logger.bind(pipeline="TicketAuditPipeline", total_tickets=total_tickets)
        audit_logger.info(f"🚀 [Pipeline Start] Initializing compliance audit sweep for {total_tickets} tickets.")

        reports = []

        for idx, ticket in enumerate(tickets):
            ticket_id = ticket.get("id") or ticket.get("number") or f"INC-{idx+1:05d}"
            self.audit_progress["currentTicketId"] = ticket_id
            self.audit_progress["completed"] = idx

            ticket_logger = audit_logger.bind(ticket_id=ticket_id, index=idx + 1)
            ticket_logger.debug(f"🔍 [Stage 1/4: Ingestion] Processing ticket {idx+1}/{total_tickets} ({ticket_id})")

            # Perform rule-based and AI compliance evaluation
            report = await self._audit_single_ticket(
                ticket=ticket,
                rules=rules,
                ci_combinations=ci_combinations,
                resolution_questions=resolution_questions,
                overall_rules=overall_rules,
                ticket_logger=ticket_logger
            )
            reports.append(report)

            if idx % 5 == 0:
                await asyncio.sleep(0.01)

        elapsed = round(time.time() - start_time, 2)
        self.processed_reports_cache = reports
        self.audit_progress = {
            "active": False,
            "total": total_tickets,
            "completed": total_tickets,
            "currentTicketId": "Audit complete"
        }

        avg_score = round(sum(r["percentage"] for r in reports) / len(reports), 1) if reports else 0.0
        flagged = sum(1 for r in reports if r["statusColor"] == "Red")

        audit_logger.info(
            f"✅ [Pipeline Complete] Finished auditing {total_tickets} tickets in {elapsed}s | "
            f"Avg Score: {avg_score}% | Flagged Low Scorers: {flagged}"
        )
        return reports

    async def _audit_single_ticket(
        self,
        ticket: Dict[str, Any],
        rules: Optional[List[Dict[str, Any]]],
        ci_combinations: Optional[List[Dict[str, Any]]],
        resolution_questions: Optional[List[Dict[str, Any]]],
        overall_rules: Optional[List[Dict[str, Any]]],
        ticket_logger: Any = logger
    ) -> Dict[str, Any]:
        ticket_id = ticket.get("id") or ticket.get("number") or ticket.get("incNumber") or "UNKNOWN"
        title = str(ticket.get("shortDescription") or ticket.get("title") or ticket.get("short_description") or "").strip()
        desc = str(ticket.get("technicalDescription") or ticket.get("description") or "").strip()
        res_desc = str(ticket.get("resolutionDescription") or ticket.get("close_notes") or "").strip()
        state = str(ticket.get("incidentState") or ticket.get("state") or "").lower()
        assignment_group = str(ticket.get("assignmentGroup") or ticket.get("assignment_group") or "N/A")
        ci_name = str(ticket.get("affectedCi") or ticket.get("cmdb_ci") or "N/A")

        scores: Dict[str, Any] = {}
        infractions: List[str] = []
        empathetic_remediation = ""
        proactive_recommendations: List[str] = []
        ai_success = False

        # Attempt structured adaptive LLM reasoning via Gemini
        if settings.GEMINI_API_KEY:
            try:
                ticket_logger.debug(f"🤖 [Stage 2/4: Gemini Audit] Evaluating incident {ticket_id} with adaptive intelligence...")
                prompt = (
                    f"Perform an auditable ITIL compliance quality audit on this ServiceNow incident:\n\n"
                    f"- Ticket ID: {ticket_id}\n"
                    f"- Short Description: {title or '[NOT PROVIDED]'}\n"
                    f"- Technical Description / Diagnostic Notes: {desc or '[NOT PROVIDED]'}\n"
                    f"- Resolution Notes / Close Notes: {res_desc or '[NOT PROVIDED]'}\n"
                    f"- State: {state or 'N/A'}\n"
                    f"- Assignment Group: {assignment_group}\n"
                    f"- Configuration Item: {ci_name}\n\n"
                    f"Evaluate specifically:\n"
                    f"1. Short Description Quality (max 10 pts): semantic clarity, affected component mentioned, user-facing vs cryptic acronyms.\n"
                    f"2. Technical Diagnostic Depth (max 15 pts): depth of technical triage, diagnostic steps, error codes, or reproducibility.\n"
                    f"3. Root Cause & Fix Verification (max 15 pts): clear underlying cause identified, verification that solution permanently rectifies defect.\n"
                    f"4. Customer Empathy & Resolution Clarity (max 10 pts): tone, clarity of communication, professional adherence.\n"
                )

                adaptive_result: IncidentAdaptiveAuditResult = await self.llm_provider.generate_structured(
                    prompt=prompt,
                    schema=IncidentAdaptiveAuditResult,
                    system_instruction=SYSTEM_AUDITOR_INSTRUCTION
                )

                if adaptive_result and adaptive_result.criteria:
                    ai_success = True
                    empathetic_remediation = adaptive_result.empathetic_remediation_draft
                    proactive_recommendations = adaptive_result.proactive_recommendations or []
                    for c in adaptive_result.criteria:
                        scores[c.criterion_name] = {
                            "score": round(float(c.score), 1),
                            "maxScore": round(float(c.max_score), 1),
                            "comment": c.rationale,
                            "guidance": c.remediation_guidance or ""
                        }
                        if not c.is_compliant and c.infraction_detail:
                            if c.infraction_detail not in infractions:
                                infractions.append(c.infraction_detail)
                    for inf in (adaptive_result.infractions or []):
                        if inf not in infractions:
                            infractions.append(inf)
                    ticket_logger.info(f"✅ [Gemini Adaptive Audit Success] Scored {len(scores)} criteria contextually.")
            except Exception as e:
                ticket_logger.warning(f"⚠️ [Adaptive LLM Fallback] Gemini evaluation encountered error: {e}. Engaging deterministic evaluator.")

        # Deterministic heuristic fallback if LLM is unavailable or failed
        if not ai_success:
            ticket_logger.debug(f"📋 [Stage 2/4: Deterministic Audit] Applying deterministic quality evaluation baseline...")
            # Criterion 1: Short Description Quality
            if len(title) < 10 or title.lower() in ("test", "issue", "error", "help"):
                scores["Short Description Quality"] = {
                    "score": 3.0, "maxScore": 10.0,
                    "comment": "Short description is brief or lacks sufficient context to identify impacted service.",
                    "guidance": "Specify the affected system and concise symptom (e.g., 'SAP Logon Error - RFC Timeout in PRD')."
                }
                infractions.append("Short description lacks descriptive context or is under 10 characters.")
            else:
                scores["Short Description Quality"] = {
                    "score": 10.0, "maxScore": 10.0,
                    "comment": "Clear short description identifying affected component.",
                    "guidance": ""
                }

            # Criterion 2: Technical Description Quality
            if len(desc) < 25 or desc.lower() in ("same as above", "pls fix", "user called"):
                scores["Technical Description Quality"] = {
                    "score": 4.0, "maxScore": 15.0,
                    "comment": "Technical description lacks diagnostic evidence, logs, or reproduction steps.",
                    "guidance": "Document user environment, error logs, diagnostic commands, or network traces."
                }
                infractions.append("Technical description lacks diagnostic depth or verification details.")
            else:
                scores["Technical Description Quality"] = {
                    "score": 15.0, "maxScore": 15.0,
                    "comment": "Comprehensive technical diagnostics documented.",
                    "guidance": ""
                }

            # Criterion 3: Resolution Details Quality
            is_resolved = any(term in state for term in ("solv", "close", "resolve", "complete"))
            if is_resolved and len(res_desc) < 20:
                scores["Resolution Description Quality"] = {
                    "score": 3.0, "maxScore": 15.0,
                    "comment": "Resolution notes do not detail the permanent fix action or verification steps.",
                    "guidance": "Detail the configuration change, patch applied, or root cause elimination procedure."
                }
                infractions.append("Resolution notes do not sufficiently detail root cause fix actions.")
            else:
                scores["Resolution Description Quality"] = {
                    "score": 15.0, "maxScore": 15.0,
                    "comment": "Resolution notes describe remediation actions.",
                    "guidance": ""
                }

            # Criterion 4: Customer Empathy & Professional Communication
            scores["Customer Empathy & Clarity"] = {
                "score": 8.0, "maxScore": 10.0,
                "comment": "Standard corporate communication standards maintained.",
                "guidance": ""
            }

            empathetic_remediation = (
                "Please review the ticket documentation to ensure full diagnostic telemetry, "
                "clear root-cause explanation, and verified resolution steps are recorded."
            )

        # Deterministic Score Aggregation & Threshold Gates (Hard Constraint: Routing & Gating remain 100% deterministic)
        current_total = sum(item["score"] for item in scores.values())
        max_possible = sum(item["maxScore"] for item in scores.values()) or 1.0
        percentage = round((current_total / max_possible) * 100, 1)

        # Strict deterministic status classification
        if percentage >= 85:
            status_color = "Green"
        elif percentage >= settings.LOW_SCORE_THRESHOLD:
            status_color = "Amber"
        else:
            status_color = "Red"

        comments = "All standards satisfied." if not infractions else "; ".join(infractions)

        ticket_logger.info(
            f"📊 [Evaluation Summary] Score: {current_total}/{max_possible} ({percentage}%) | "
            f"Rating: {status_color} | Infractions: {len(infractions)}"
        )

        return {
            "ticket": ticket,
            "ksl": "Yes" if percentage >= 80 else "No",
            "audited": "Yes",
            "scores": scores,
            "totalScore": current_total,
            "percentage": percentage,
            "statusColor": status_color,
            "generalComments": comments,
            "infractions": infractions,
            "empatheticRemediation": empathetic_remediation,
            "proactiveRecommendations": proactive_recommendations
        }

audit_service = AuditService()

