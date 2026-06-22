from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field


class LubricationRecordCreate(BaseModel):
    uuid_local: str | None = None
    area_id: int
    machine_id: int
    ot: str = Field(..., min_length=1, max_length=50)
    lubricant_id: int
    cantidad: float = Field(..., gt=0)
    unidad: str = Field(..., min_length=1, max_length=20)
    fecha_registro: date
    hora_registro: time
    observaciones: str | None = None
    evidencia_url: str | None = None
    evidencia_antes_url: str | None = None
    evidencia_durante_url: str | None = None
    evidencia_despues_url: str | None = None


class LubricationRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid_local: str | None
    area_id: int
    machine_id: int
    user_id: int
    supervisor_id: int | None
    ot: str
    lubricant_id: int
    cantidad: float
    unidad: str
    fecha_registro: date
    hora_registro: time
    observaciones: str | None
    evidencia_url: str | None
    evidencia_antes_url: str | None = None
    evidencia_durante_url: str | None = None
    evidencia_despues_url: str | None = None
    estado_sincronizacion: str
    estado_validacion: str
    comentario_supervisor: str | None
    fecha_validacion: datetime | None
    created_at: datetime
    synced_at: datetime | None
    user_nombre: str | None = None
    machine_nombre: str | None = None
    area_nombre: str | None = None
    lubricant_nombre: str | None = None
    supervisor_nombre: str | None = None
    machine_foto_url: str | None = None


class SyncBatchRequest(BaseModel):
    records: list[LubricationRecordCreate]


class ValidationRequest(BaseModel):
    comentario: str | None = None


class LubricationRecordCorrection(BaseModel):
    lubricant_id: int
    cantidad: float = Field(..., gt=0)
    unidad: str = Field(..., min_length=1, max_length=20)
    observaciones: str | None = None
    evidencia_url: str | None = None
    evidencia_antes_url: str | None = None
    evidencia_durante_url: str | None = None
    evidencia_despues_url: str | None = None


class SupervisorDailyKPIs(BaseModel):
    registros_hoy: int
    pendientes_validacion: int
    validados_hoy: int
    rechazados_hoy: int
    correcciones_pendientes: int
    registros_por_area_hoy: dict[str, int]


class KPIsGeneral(BaseModel):
    total_lubricaciones: int
    total_por_area: dict[str, int]
    total_por_maquina: dict[str, int]
    pendientes_validacion: int
    validados: int
    rechazados: int
    consumo_total: float
    consumo_por_lubricante: dict[str, float]
    maquinas_sin_lubricacion_reciente: list[str]
    pendientes_sincronizacion: int
