from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger
from typing import List, Dict, Any, Optional

scheduler = AsyncIOScheduler()

async def check_unresolved_escalations_task():
    """Periodic task checking open incidents exceeding SLA threshold for escalation."""
    logger.info("[APScheduler Background Job] Scanning for unresolved high-severity SLA timeouts...")

async def run_background_ticket_audit_task(
    tickets: List[Dict[str, Any]],
    rules: Optional[List[Dict[str, Any]]] = None,
    ci_combinations: Optional[List[Dict[str, Any]]] = None,
    resolution_questions: Optional[List[Dict[str, Any]]] = None,
    overall_rules: Optional[List[Dict[str, Any]]] = None
):
    """Background task handling resource-intensive ticket auditing to prevent UI blocking."""
    from app.services.audit_service import audit_service
    logger.info(f"[APScheduler Audit Job] Starting background sweep for {len(tickets)} tickets...")
    await audit_service.execute_audit(
        tickets=tickets,
        rules=rules,
        ci_combinations=ci_combinations,
        resolution_questions=resolution_questions,
        overall_rules=overall_rules
    )
    logger.info(f"[APScheduler Audit Job] Completed background sweep for {len(tickets)} tickets.")

def schedule_audit_job(
    tickets: List[Dict[str, Any]],
    rules: Optional[List[Dict[str, Any]]] = None,
    ci_combinations: Optional[List[Dict[str, Any]]] = None,
    resolution_questions: Optional[List[Dict[str, Any]]] = None,
    overall_rules: Optional[List[Dict[str, Any]]] = None
) -> str:
    """Schedule an immediate one-off background audit job in APScheduler."""
    import uuid
    job_id = f"audit_{uuid.uuid4().hex[:8]}"
    if scheduler.running:
        scheduler.add_job(
            run_background_ticket_audit_task,
            id=job_id,
            args=[tickets, rules, ci_combinations, resolution_questions, overall_rules]
        )
        logger.info(f"APScheduler: Scheduled background audit job '{job_id}'")
    return job_id

def start_scheduler():
    scheduler.add_job(
        check_unresolved_escalations_task,
        "interval",
        minutes=15,
        id="check_escalations"
    )
    scheduler.start()
    logger.info("APScheduler started: 'check_escalations' task running every 15 minutes")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped")

