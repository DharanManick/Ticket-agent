from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Gemini Models Centralization
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    GEMINI_FALLBACK_EMBEDDING_MODELS: List[str] = ["gemini-embedding-2"]
    GEMINI_TEMPERATURE: float = 0.2

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./incidents.db"

    # SMTP / Microsoft Graph
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = ""
    SMTP_PASSWORD: Optional[str] = ""
    EMAIL_FROM: Optional[str] = "alerts@company.com"
    MICROSOFT_GRAPH_TOKEN: Optional[str] = ""
    OUTLOOK_SENDER_MAILBOX: Optional[str] = "compliance-bot@company.com"

    # Teams / Power Automate Webhook
    TEAMS_WEBHOOK_URL: Optional[str] = ""
    TEAMS_MANAGER_WEBHOOK_URL: Optional[str] = ""

    # Compliance & Alert Thresholds (Deterministic)
    LOW_SCORE_THRESHOLD: float = 75.0
    IDLE_WARNING_THRESHOLD_HOURS: int = 16

    # Logging
    LOG_LEVEL: str = "INFO"

settings = Settings()
