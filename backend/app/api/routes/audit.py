from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from loguru import logger
from app.services.audit_service import audit_service
from app.scheduler.tasks import schedule_audit_job

router = APIRouter(prefix="", tags=["Audit"])

class AuditRequest(BaseModel):
    tickets: List[Dict[str, Any]]
    customRules: Optional[List[Dict[str, Any]]] = None
    customCiCombinations: Optional[List[Dict[str, Any]]] = None
    customResolutionQuestions: Optional[List[Dict[str, Any]]] = None
    customOverallRules: Optional[List[Dict[str, Any]]] = None
    asyncMode: Optional[bool] = False

@router.get("/audit")
@router.get("/api/audit")
async def get_audit_reports():
    """Retrieve processed compliance audit reports cache."""
    logger.info("HTTP GET /api/audit requested - fetching cached audit reports")
    return {
        "success": True,
        "reports": audit_service.get_reports()
    }

@router.post("/audit")
@router.post("/api/audit")
async def run_audit(req: AuditRequest, background_tasks: BackgroundTasks):
    """Execute LLM / rule-based compliance audit over ticket list in foreground or background."""
    ticket_count = len(req.tickets) if isinstance(req.tickets, list) else 0
    logger.info(f"HTTP POST /api/audit received | Tickets: {ticket_count} | Async: {req.asyncMode}")

    if not isinstance(req.tickets, list):
        logger.warning("HTTP POST /api/audit rejected: Invalid ticket list format.")
        raise HTTPException(status_code=400, detail="Please upload or provide valid ticket listings.")

    if req.asyncMode or ticket_count > 20:
        # Schedule via APScheduler background job to prevent UI blocking on large batches
        job_id = schedule_audit_job(
            tickets=req.tickets,
            rules=req.customRules,
            ci_combinations=req.customCiCombinations,
            resolution_questions=req.customResolutionQuestions,
            overall_rules=req.customOverallRules
        )
        logger.info(f"Dispatched background audit job {job_id} for {ticket_count} tickets")
        return {
            "success": True,
            "message": "Audit task scheduled in background via APScheduler.",
            "jobId": job_id,
            "asyncMode": True,
            "reports": audit_service.get_reports()
        }

    reports = await audit_service.execute_audit(
        tickets=req.tickets,
        rules=req.customRules,
        ci_combinations=req.customCiCombinations,
        resolution_questions=req.customResolutionQuestions,
        overall_rules=req.customOverallRules
    )
    return {
        "success": True,
        "reports": reports
    }

@router.get("/audit-progress")
@router.get("/api/audit-progress")
async def get_audit_progress():
    """Get current audit sweep progress."""
    return audit_service.get_progress()


