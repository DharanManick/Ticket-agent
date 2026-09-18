from fastapi import APIRouter
from app.api.routes import incidents, rules, notifications, audit, user

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(incidents.router)
api_router.include_router(rules.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(user.router)


