import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LubricantStatus(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"


class Lubricant(Base):
    __tablename__ = "lubricants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150))
    codigo: Mapped[str] = mapped_column(String(50), unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    unidad_default: Mapped[str] = mapped_column(String(20), default="ml")
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estado: Mapped[LubricantStatus] = mapped_column(
        Enum(LubricantStatus), default=LubricantStatus.activo
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
