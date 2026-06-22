import enum
from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SyncStatus(str, enum.Enum):
    local = "local"
    pendiente = "pendiente"
    sincronizado = "sincronizado"
    error = "error"


class ValidationStatus(str, enum.Enum):
    pendiente = "pendiente"
    validado = "validado"
    rechazado = "rechazado"
    correccion_solicitada = "correccion_solicitada"


class LubricationRecord(Base):
    __tablename__ = "lubrication_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid_local: Mapped[str | None] = mapped_column(String(36), unique=True, index=True)
    area_id: Mapped[int] = mapped_column(Integer, ForeignKey("areas.id"))
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("machines.id"))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    supervisor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    ot: Mapped[str] = mapped_column(String(50))
    lubricant_id: Mapped[int] = mapped_column(Integer, ForeignKey("lubricants.id"))
    cantidad: Mapped[float] = mapped_column(Float)
    unidad: Mapped[str] = mapped_column(String(20))
    fecha_registro: Mapped[date] = mapped_column(Date)
    hora_registro: Mapped[time] = mapped_column(Time)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidencia_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    evidencia_antes_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    evidencia_durante_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    evidencia_despues_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estado_sincronizacion: Mapped[SyncStatus] = mapped_column(
        Enum(SyncStatus), default=SyncStatus.sincronizado
    )
    estado_validacion: Mapped[ValidationStatus] = mapped_column(
        Enum(ValidationStatus), default=ValidationStatus.pendiente
    )
    comentario_supervisor: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_validacion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    area: Mapped["Area"] = relationship(back_populates="records")
    machine: Mapped["Machine"] = relationship(back_populates="records")
    user: Mapped["User"] = relationship(
        back_populates="records", foreign_keys=[user_id]
    )
    supervisor: Mapped["User | None"] = relationship(foreign_keys=[supervisor_id])
    lubricant: Mapped["Lubricant"] = relationship()


from app.models.area import Area  # noqa: E402
from app.models.machine import Machine  # noqa: E402
from app.models.lubricant import Lubricant  # noqa: E402
from app.models.user import User  # noqa: E402
