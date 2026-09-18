from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.core.logging import setup_logging
from app.core.database import init_db
from app.api.router import api_router
from app.api.routes import audit, user
from app.scheduler.tasks import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("Initializing Agentic AI FastAPI Service...")
    await init_db()
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()
    logger.info("Agentic AI Service shutdown complete.")

app = FastAPI(
    title="Incident Management Agentic AI Platform",
    description="Refactored Agentic AI Architecture powered by Gemini (@google/genai), LangGraph, and FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(audit.router)
app.include_router(user.router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "agentic-ai-backend",
        "version": "1.0.0",
        "environment": settings.ENV
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
