from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.incident import IncidentCreate, IncidentSchema
from app.services.incident_service import incident_service
from app.tools.spreadsheet_tool import export_incidents_to_excel

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.post("/", response_model=IncidentSchema)
async def create_incident(
    incident_in: IncidentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new incident and run agentic evaluation pipeline."""
    return await incident_service.create_and_process_incident(db, incident_in)

@router.get("/", response_model=List[IncidentSchema])
async def list_incidents(db: AsyncSession = Depends(get_db)):
    """List all incidents."""
    return await incident_service.list_incidents(db)

@router.get("/{incident_id}", response_model=IncidentSchema)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details for a single incident."""
    inc = await incident_service.get_incident(db, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.get("/export/excel")
async def export_excel(db: AsyncSession = Depends(get_db)):
    """Export incidents as Excel spreadsheet using Pandas & OpenPyXL tool."""
    incidents = await incident_service.list_incidents(db)
    data = [inc.model_dump() for inc in incidents]
    excel_bytes = export_incidents_to_excel(data)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=incidents_export.xlsx"}
    )
