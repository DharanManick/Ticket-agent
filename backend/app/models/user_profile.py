from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class UserProfileModel(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True, default="default_user")
    name: Mapped[str] = mapped_column(String(255), default="John Doe")
    role: Mapped[str] = mapped_column(String(255), default="Lead Audit Officer")
    theme: Mapped[str] = mapped_column(String(50), default="dark")
    preferences: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
