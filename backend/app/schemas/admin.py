from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    rut: str = Field(..., min_length=8, max_length=12)
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    pin: str = Field(..., min_length=4, max_length=20)
    rol: str
    area_ids: list[int] = []


class UserUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    apellido: str | None = Field(None, min_length=1, max_length=100)
    rol: str | None = None
    estado: str | None = None
    area_ids: list[int] | None = None


class PinResetRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=20)


class AreaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    descripcion: str | None = None


class AreaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=150)
    descripcion: str | None = None
    estado: str | None = None


class MachineCreate(BaseModel):
    area_id: int
    nombre: str = Field(..., min_length=1, max_length=150)
    tag: str = Field(..., min_length=1, max_length=50)
    codigo_interno: str | None = None
    descripcion: str | None = None
    tipo_maquina: str | None = None
    lubricante_recomendado_id: int | None = None
    frecuencia_dias: int | None = Field(None, ge=1)
    estado: str = "activa"


class MachineUpdate(BaseModel):
    area_id: int | None = None
    nombre: str | None = Field(None, min_length=1, max_length=150)
    tag: str | None = Field(None, min_length=1, max_length=50)
    codigo_interno: str | None = None
    descripcion: str | None = None
    tipo_maquina: str | None = None
    lubricante_recomendado_id: int | None = None
    frecuencia_dias: int | None = Field(None, ge=1)
    estado: str | None = None


class LubricantCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    codigo: str = Field(..., min_length=1, max_length=50)
    descripcion: str | None = None
    unidad_default: str = Field(default="ml", max_length=20)


class LubricantUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=150)
    codigo: str | None = Field(None, min_length=1, max_length=50)
    descripcion: str | None = None
    unidad_default: str | None = Field(None, max_length=20)
    estado: str | None = None
