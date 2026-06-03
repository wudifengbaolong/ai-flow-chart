import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FlowProject(Base):
    __tablename__ = "flow_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    graph_json: Mapped[dict] = mapped_column(JSON)
    puml_source: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
