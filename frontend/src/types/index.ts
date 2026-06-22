export type UserRole = 'mecanico' | 'supervisor' | 'ito' | 'admin'

export interface AuthUser {
  userId: number
  rut: string
  nombre: string
  apellido: string
  rol: UserRole
  areaIds: number[]
  token: string
}

export interface Area {
  id: number
  nombre: string
  descripcion: string | null
  estado: string
  machine_count: number
  pending_validations: number
}

export interface Machine {
  id: number
  area_id: number
  nombre: string
  tag: string
  codigo_interno: string | null
  descripcion: string | null
  foto_url: string | null
  tipo_maquina: string | null
  lubricante_recomendado_id: number | null
  lubricante_recomendado_nombre?: string | null
  area_nombre?: string | null
  frecuencia_dias: number | null
  estado: string
  last_lubrication_date: string | null
  dias_desde_ultima?: number | null
  cumplimiento?: string | null
}

export interface Lubricant {
  id: number
  nombre: string
  codigo: string
  descripcion: string | null
  unidad_default: string
  foto_url?: string | null
  estado: string
}

export interface LubricationRecord {
  id?: number
  uuid_local?: string
  area_id: number
  machine_id: number
  user_id?: number
  ot: string
  lubricant_id: number
  cantidad: number
  unidad: string
  fecha_registro: string
  hora_registro: string
  observaciones?: string | null
  evidencia_url?: string | null
  evidencia_antes_url?: string | null
  evidencia_durante_url?: string | null
  evidencia_despues_url?: string | null
  estado_sincronizacion?: string
  estado_validacion?: string
  comentario_supervisor?: string | null
  fecha_validacion?: string | null
  user_nombre?: string | null
  supervisor_nombre?: string | null
  machine_nombre?: string | null
  machine_foto_url?: string | null
  area_nombre?: string | null
  lubricant_nombre?: string | null
}

export interface AdminUser {
  id: number
  rut: string
  nombre: string
  apellido: string
  rol: UserRole
  estado: string
  area_ids: number[]
}

export interface UserCreateInput {
  rut: string
  nombre: string
  apellido: string
  pin: string
  rol: UserRole
  area_ids: number[]
}

export interface UserUpdateInput {
  nombre?: string
  apellido?: string
  rol?: UserRole
  estado?: string
  area_ids?: number[]
}

export interface AreaInput {
  nombre: string
  descripcion?: string | null
  estado?: string
}

export interface MachineInput {
  area_id: number
  nombre: string
  tag: string
  codigo_interno?: string | null
  descripcion?: string | null
  tipo_maquina?: string | null
  lubricante_recomendado_id?: number | null
  frecuencia_dias?: number | null
  estado?: string
}

export interface LubricantInput {
  nombre: string
  codigo: string
  descripcion?: string | null
  unidad_default?: string
  estado?: string
}

export interface MechanicUser {
  id: number
  rut: string
  nombre: string
  apellido: string
  rol: string
  estado: string
  area_ids: number[]
}

export interface SupervisorDailyKPIs {
  registros_hoy: number
  pendientes_validacion: number
  validados_hoy: number
  rechazados_hoy: number
  correcciones_pendientes: number
  registros_por_area_hoy: Record<string, number>
}

export interface ReportPreviewMeta {
  titulo: string
  subtitulo: string
  generado_en: string
  generado_por: string
  rol: string
  filtros: {
    area: string
    maquina: string
    fecha_inicio: string | null
    fecha_fin: string | null
  }
}

export interface ReportAreaSummary {
  area: string
  total: number
  validados: number
  consumo: number
}

export interface ReportPreview {
  meta: ReportPreviewMeta
  total: number
  validados: number
  pendientes: number
  rechazados: number
  correcciones?: number
  consumo_total: number
  con_evidencia: number
  evidencia_completa?: number
  porcentaje_evidencia: number
  porcentaje_evidencia_completa?: number
  resumen_areas: ReportAreaSummary[]
  rows: ReportPreviewRow[]
}

export interface ReportPreviewRow {
  id: number
  fecha: string
  hora: string
  area: string
  area_id: number
  maquina: string
  machine_tag: string
  machine_foto_url: string | null
  ot: string
  lubricante: string
  lubricante_codigo: string
  cantidad: number
  unidad: string
  responsable: string
  supervisor: string | null
  fecha_validacion: string | null
  observaciones: string | null
  evidencia_url: string | null
  evidencia_antes_url: string | null
  evidencia_durante_url: string | null
  evidencia_despues_url: string | null
  comentario_supervisor: string | null
  estado: string
  tiene_evidencia: boolean
  evidencia_completa: boolean
  evidencias_count: number
}

export interface TrendPoint {
  periodo: string
  valor: number
}

export interface RankingItem {
  nombre: string
  valor: number
  extra?: string | null
}

export interface MachineAlert {
  machine_id: number
  nombre: string
  area: string
  dias_sin_lubricacion: number | null
  cumplimiento: string
}

export interface ExecutiveKPIs {
  cumplimiento_general: number
  total_maquinas: number
  maquinas_al_dia: number
  tendencia_semanal: TrendPoint[]
  tendencia_mensual: TrendPoint[]
  ranking_areas: RankingItem[]
  ranking_mecanicos: RankingItem[]
  consumo_por_area: Record<string, number>
  alertas_maquinas: MachineAlert[]
  areas_consumo_elevado: string[]
}

export interface MachineKPIItem {
  machine_id: number
  nombre: string
  tag: string
  total_lubricaciones: number
  consumo_total: number
  ultima_fecha: string | null
  cumplimiento: string | null
}

export interface AreaKPIs {
  area_id: number
  area_nombre: string
  total_lubricaciones: number
  consumo_total: number
  pendientes_validacion: number
  validados: number
  rechazados: number
  maquinas: MachineKPIItem[]
}

export interface MachineKPIs {
  machine_id: number
  machine_nombre: string
  area_nombre: string
  total_lubricaciones: number
  consumo_total: number
  pendientes_validacion: number
  validados: number
  frecuencia_dias: number | null
  dias_desde_ultima: number | null
  cumplimiento: string | null
}

export interface AuditLogEntry {
  id: number
  user_nombre: string | null
  accion: string
  modulo: string
  registro_id: number | null
  detalle: string | null
  created_at: string
}

export interface RecordTraceability {
  record_id: number
  ot: string
  eventos: AuditLogEntry[]
}

export interface KPIs {
  total_lubricaciones: number
  total_por_area: Record<string, number>
  total_por_maquina: Record<string, number>
  pendientes_validacion: number
  validados: number
  rechazados: number
  consumo_total: number
  consumo_por_lubricante: Record<string, number>
  maquinas_sin_lubricacion_reciente: string[]
  pendientes_sincronizacion: number
}
