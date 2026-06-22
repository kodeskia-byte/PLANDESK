from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    estado: str
    machine_count: int = 0
    pending_validations: int = 0


class LubricantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    codigo: str
    descripcion: str | None
    unidad_default: str
    foto_url: str | None = None
    estado: str


class MachineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    area_id: int
    nombre: str
    tag: str
    codigo_interno: str | None
    descripcion: str | None
    foto_url: str | None
    tipo_maquina: str | None
    lubricante_recomendado_id: int | None
    lubricante_recomendado_nombre: str | None = None
    area_nombre: str | None = None
    frecuencia_dias: int | None
    estado: str
    last_lubrication_date: datetime | None = None
    dias_desde_ultima: int | None = None
    cumplimiento: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rut: str
    nombre: str
    apellido: str
    rol: str
    estado: str
    area_ids: list[int] = []
