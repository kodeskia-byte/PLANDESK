import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    mecanico = "mecanico"
    supervisor = "supervisor"
    ito = "ito"
    admin = "admin"


class UserStatus(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    bloqueado = "bloqueado"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rut: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    apellido: Mapped[str] = mapped_column(String(100))
    pin_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.mecanico)
    estado: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.activo)
    login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    areas: Mapped[list["UserArea"]] = relationship(back_populates="user")
    records: Mapped[list["LubricationRecord"]] = relationship(
        back_populates="user", foreign_keys="LubricationRecord.user_id"
    )


class UserArea(Base):
    __tablename__ = "user_areas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    area_id: Mapped[int] = mapped_column(Integer, ForeignKey("areas.id"))

    user: Mapped["User"] = relationship(back_populates="areas")
    area: Mapped["Area"] = relationship(back_populates="users")


from app.models.area import Area  # noqa: E402
from app.models.lubrication_record import LubricationRecord  # noqa: E402
