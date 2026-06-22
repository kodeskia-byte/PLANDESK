import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MachineStatus(str, enum.Enum):
    activa = "activa"
    inactiva = "inactiva"
    en_mantencion = "en_mantencion"


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    area_id: Mapped[int] = mapped_column(Integer, ForeignKey("areas.id"))
    nombre: Mapped[str] = mapped_column(String(150))
    tag: Mapped[str] = mapped_column(String(50), index=True)
    codigo_interno: Mapped[str | None] = mapped_column(String(50), nullable=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tipo_maquina: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lubricante_recomendado_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lubricants.id"), nullable=True
    )
    frecuencia_dias: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado: Mapped[MachineStatus] = mapped_column(
        Enum(MachineStatus), default=MachineStatus.activa
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    area: Mapped["Area"] = relationship(back_populates="machines")
    lubricante_recomendado: Mapped["Lubricant | None"] = relationship()
    records: Mapped[list["LubricationRecord"]] = relationship(back_populates="machine")


from app.models.area import Area  # noqa: E402
from app.models.lubricant import Lubricant  # noqa: E402
from app.models.lubrication_record import LubricationRecord  # noqa: E402
