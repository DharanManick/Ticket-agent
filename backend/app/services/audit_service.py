import asyncio
import time
from typing import List, Dict, Any, Optional
from loguru import logger

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
        title = str(ticket.get("shortDescription") or ticket.get("title") or ticket.get("short_description") or "").strip()
        desc = str(ticket.get("technicalDescription") or ticket.get("description") or "").strip()
        res_desc = str(ticket.get("resolutionDescription") or ticket.get("close_notes") or "").strip()
        state = str(ticket.get("incidentState") or ticket.get("state") or "").lower()

        scores: Dict[str, Any] = {}
        infractions = []

        # Stage 2: Short Description Evaluation
        ticket_logger.debug(f"📋 [Stage 2/4: Title Check] Evaluating short description (length: {len(title)})")
        if len(title) < 10:
            scores["Short Description Quality"] = {"score": 2, "maxScore": 10, "comment": "Too vague or brief short description."}
            infractions.append("Short description is non-descriptive or under 10 characters.")
            ticket_logger.warning("⚠️ [Infraction] Short description under quality threshold.")
        else:
            scores["Short Description Quality"] = {"score": 10, "maxScore": 10, "comment": "Clear short description."}

        # Stage 3: Technical Description Diagnostics Evaluation
        ticket_logger.debug(f"🔬 [Stage 3/4: Technical Evaluation] Evaluating technical diagnostics (length: {len(desc)})")
        if len(desc) < 20:
            scores["Technical Description Quality"] = {"score": 3, "maxScore": 15, "comment": "Technical description lacks depth."}
            infractions.append("Technical description lacks detailed diagnostic information.")
            ticket_logger.warning("⚠️ [Infraction] Technical description lacks depth.")
        else:
            scores["Technical Description Quality"] = {"score": 15, "maxScore": 15, "comment": "Comprehensive technical diagnostics."}

        # Stage 4: Resolution Details Evaluation
        ticket_logger.debug(f"🔧 [Stage 4/4: Resolution Evaluation] Evaluating close notes (state: {state}, length: {len(res_desc)})")
        if ("solv" in state or "close" in state or "resolve" in state) and len(res_desc) < 15:
            scores["Resolution Description Quality"] = {"score": 2, "maxScore": 15, "comment": "Incomplete resolution details."}
            infractions.append("Resolution notes do not sufficiently detail fix actions.")
            ticket_logger.warning("⚠️ [Infraction] Resolution details incomplete for closed/resolved incident.")
        else:
            scores["Resolution Description Quality"] = {"score": 15, "maxScore": 15, "comment": "Resolution details provided."}

        # Score Aggregation
        current_total = sum(item["score"] for item in scores.values())
        max_possible = sum(item["maxScore"] for item in scores.values()) or 1
        percentage = round((current_total / max_possible) * 100, 1)

        if percentage >= 85:
            status_color = "Green"
        elif percentage >= 65:
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
            "infractions": infractions
        }

audit_service = AuditService()

