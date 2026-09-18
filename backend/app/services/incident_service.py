import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.incident import IncidentModel
from app.schemas.incident import IncidentCreate, IncidentSchema
from app.orchestration.graph import incident_pipeline
from app.orchestration.state import IncidentProcessingState
from app.memory.vector_store import vector_memory

class IncidentService:
    """Service handling Incident creation, pipeline execution, and database persistence."""

    async def create_and_process_incident(
        self, db: AsyncSession, incident_in: IncidentCreate
    ) -> IncidentSchema:
        logger.info(f"Processing new incident: {incident_in.title}")

        # 1. Initialize LangGraph State
        initial_state: IncidentProcessingState = {
            "incident": incident_in,
            "incident_id": str(uuid.uuid4()),
            "vector_context": [],
            "matched_rule": None,
            "ci_matrix": None,
            "ai_evaluation": None,
            "final_incident": None,
            "notifications_sent": [],
            "error": None
        }

        # 2. Run LangGraph Stateful Pipeline
        final_state = await incident_pipeline.ainvoke(initial_state)

        # 3. Extract evaluation results
        ai_eval = final_state.get("ai_evaluation")
        matched_rule = final_state.get("matched_rule")
        ci_matrix = final_state.get("ci_matrix")

        assignee = incident_in.assignee_email or (ci_matrix.primary_owner if ci_matrix else None)
        manager = incident_in.manager_email or (ci_matrix.manager_owner if ci_matrix else None)

        # 4. Save to Database (SQLAlchemy)
        db_incident = IncidentModel(
            id=initial_state["incident_id"],
            title=incident_in.title,
            description=incident_in.description,
            source=incident_in.source,
            severity=ai_eval.predicted_severity if ai_eval else incident_in.severity,
            status="Open",
            ci_name=incident_in.ci_name,
            assignee_email=assignee,
            manager_email=manager,
            ai_summary=ai_eval.summary if ai_eval else None,
            ai_recommended_action=ai_eval.recommended_action if ai_eval else None,
            matched_rule_id=matched_rule.id if matched_rule else None,
            escalation_level=1
        )
        db.add(db_incident)
        await db.commit()
        await db.refresh(db_incident)

        # 5. Add to Vector Memory for future RAG retrieval
        vector_memory.add_incident(
            incident_id=db_incident.id,
            text=f"{db_incident.title}: {db_incident.description} | Action: {db_incident.ai_recommended_action}"
        )

        logger.info(f"Incident {db_incident.id} created and processed successfully.")
        return IncidentSchema.model_validate(db_incident)

    async def list_incidents(self, db: AsyncSession) -> List[IncidentSchema]:
        result = await db.execute(select(IncidentModel).order_by(IncidentModel.created_at.desc()))
        incidents = result.scalars().all()
        return [IncidentSchema.model_validate(inc) for inc in incidents]

    async def get_incident(self, db: AsyncSession, incident_id: str) -> Optional[IncidentSchema]:
        result = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
        inc = result.scalar_one_or_none()
        return IncidentSchema.model_validate(inc) if inc else None

incident_service = IncidentService()
