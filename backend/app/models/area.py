import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AreaStatus(str, enum.Enum):
    activa = "activa"
    inactiva = "inactiva"


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[AreaStatus] = mapped_column(Enum(AreaStatus), default=AreaStatus.activa)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    machines: Mapped[list["Machine"]] = relationship(back_populates="area")
    users: Mapped[list["UserArea"]] = relationship(back_populates="area")
    records: Mapped[list["LubricationRecord"]] = relationship(back_populates="area")


from app.models.machine import Machine  # noqa: E402
from app.models.lubrication_record import LubricationRecord  # noqa: E402
from app.models.user import UserArea  # noqa: E402
