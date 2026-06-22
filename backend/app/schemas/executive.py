from pydantic import BaseModel


class TrendPoint(BaseModel):
    periodo: str
    valor: int


class RankingItem(BaseModel):
    nombre: str
    valor: float
    extra: str | None = None


class MachineAlert(BaseModel):
    machine_id: int
    nombre: str
    area: str
    dias_sin_lubricacion: int | None
    cumplimiento: str


class ExecutiveKPIs(BaseModel):
    cumplimiento_general: float
    total_maquinas: int
    maquinas_al_dia: int
    tendencia_semanal: list[TrendPoint]
    tendencia_mensual: list[TrendPoint]
    ranking_areas: list[RankingItem]
    ranking_mecanicos: list[RankingItem]
    consumo_por_area: dict[str, float]
    alertas_maquinas: list[MachineAlert]
    areas_consumo_elevado: list[str]


class MachineKPIItem(BaseModel):
    machine_id: int
    nombre: str
    tag: str
    total_lubricaciones: int
    consumo_total: float
    ultima_fecha: str | None
    cumplimiento: str | None


class AreaKPIs(BaseModel):
    area_id: int
    area_nombre: str
    total_lubricaciones: int
    consumo_total: float
    pendientes_validacion: int
    validados: int
    rechazados: int
    maquinas: list[MachineKPIItem]


class MachineKPIs(BaseModel):
    machine_id: int
    machine_nombre: str
    area_nombre: str
    total_lubricaciones: int
    consumo_total: float
    pendientes_validacion: int
    validados: int
    frecuencia_dias: int | None
    dias_desde_ultima: int | None
    cumplimiento: str | None


class AuditLogOut(BaseModel):
    id: int
    user_nombre: str | None
    accion: str
    modulo: str
    registro_id: int | None
    detalle: str | None
    created_at: str


class RecordTraceability(BaseModel):
    record_id: int
    ot: str
    eventos: list[AuditLogOut]
