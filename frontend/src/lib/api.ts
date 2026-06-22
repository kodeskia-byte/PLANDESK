import type {
  AdminUser,
  Area,
  AreaInput,
  AreaKPIs,
  AuditLogEntry,
  AuthUser,
  ExecutiveKPIs,
  KPIs,
  Lubricant,
  LubricantInput,
  LubricationRecord,
  Machine,
  MachineInput,
  MachineKPIs,
  MechanicUser,
  RecordTraceability,
  ReportPreview,
  SupervisorDailyKPIs,
  UserCreateInput,
  UserUpdateInput,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de conexión' }))
    throw new Error(err.detail || 'Error en la solicitud')
  }
  if (res.status === 204) return {} as T
  return res.json()
}

export async function login(rut: string, pin: string): Promise<AuthUser> {
  const data = await request<{
    access_token: string
    user_id: number
    rut: string
    nombre: string
    apellido: string
    rol: AuthUser['rol']
    area_ids: number[]
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ rut, pin }),
  })
  return {
    token: data.access_token,
    userId: data.user_id,
    rut: data.rut,
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol,
    areaIds: data.area_ids,
  }
}

export const api = {
  getAreas: (token: string, params?: { include_inactive?: boolean }) => {
    const qs = params?.include_inactive ? '?include_inactive=true' : ''
    return request<Area[]>(`/areas${qs}`, {}, token)
  },
  getArea: (token: string, id: number) =>
    request<Area>(`/areas/${id}`, {}, token),
  createArea: (token: string, data: AreaInput) =>
    request<Area>('/areas', { method: 'POST', body: JSON.stringify(data) }, token),
  updateArea: (token: string, id: number, data: Partial<AreaInput>) =>
    request<Area>(`/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  getMachines: (token: string, params?: { areaId?: number; include_inactive?: boolean }) => {
    const search = new URLSearchParams()
    if (params?.areaId) search.set('area_id', String(params.areaId))
    if (params?.include_inactive) search.set('include_inactive', 'true')
    const qs = search.toString()
    return request<Machine[]>(`/machines${qs ? `?${qs}` : ''}`, {}, token)
  },
  createMachine: (token: string, data: MachineInput) =>
    request<Machine>('/machines', { method: 'POST', body: JSON.stringify(data) }, token),
  updateMachine: (token: string, id: number, data: Partial<MachineInput>) =>
    request<Machine>(`/machines/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  uploadMachinePhoto: async (token: string, machineId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ foto_url: string }>(`/machines/${machineId}/photo`, {
      method: 'POST',
      body: form,
      headers: {},
    }, token)
  },
  getMachine: (token: string, id: number) =>
    request<Machine>(`/machines/${id}`, {}, token),
  getLubricants: (token: string, params?: { include_inactive?: boolean }) => {
    const qs = params?.include_inactive ? '?include_inactive=true' : ''
    return request<Lubricant[]>(`/lubricants${qs}`, {}, token)
  },
  createLubricant: (token: string, data: LubricantInput) =>
    request<Lubricant>('/lubricants', { method: 'POST', body: JSON.stringify(data) }, token),
  updateLubricant: (token: string, id: number, data: Partial<LubricantInput>) =>
    request<Lubricant>(`/lubricants/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  uploadLubricantPhoto: async (token: string, lubricantId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ foto_url: string }>(`/lubricants/${lubricantId}/photo`, {
      method: 'POST',
      body: form,
      headers: {},
    }, token)
  },
  getUsers: (token: string) => request<AdminUser[]>('/users', {}, token),
  createUser: (token: string, data: UserCreateInput) =>
    request<AdminUser>('/users', { method: 'POST', body: JSON.stringify(data) }, token),
  updateUser: (token: string, id: number, data: UserUpdateInput) =>
    request<AdminUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  resetUserPin: (token: string, id: number, pin: string) =>
    request<{ message: string }>(`/users/${id}/reset-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }, token),
  getRecords: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<LubricationRecord[]>(`/lubrication-records${qs}`, {}, token)
  },
  getRecord: (token: string, id: number) =>
    request<LubricationRecord>(`/lubrication-records/${id}`, {}, token),
  createRecord: (token: string, record: LubricationRecord) =>
    request<LubricationRecord>('/lubrication-records', {
      method: 'POST',
      body: JSON.stringify(record),
    }, token),
  submitCorrection: (
    token: string,
    id: number,
    data: {
      lubricant_id: number
      cantidad: number
      unidad: string
      observaciones?: string | null
      evidencia_url?: string | null
      evidencia_antes_url?: string | null
      evidencia_durante_url?: string | null
      evidencia_despues_url?: string | null
    },
  ) =>
    request<LubricationRecord>(`/lubrication-records/${id}/correction`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
  syncRecords: (token: string, records: LubricationRecord[]) =>
    request<LubricationRecord[]>('/lubrication-records/sync', {
      method: 'POST',
      body: JSON.stringify({ records }),
    }, token),
  validateRecord: (token: string, id: number, comentario?: string) =>
    request<LubricationRecord>(`/lubrication-records/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ comentario }),
    }, token),
  rejectRecord: (token: string, id: number, comentario: string) =>
    request<LubricationRecord>(`/lubrication-records/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comentario }),
    }, token),
  requestCorrection: (token: string, id: number, comentario: string) =>
    request<LubricationRecord>(`/lubrication-records/${id}/request-correction`, {
      method: 'POST',
      body: JSON.stringify({ comentario }),
    }, token),
  getKPIs: (token: string) => request<KPIs>('/kpis/general', {}, token),
  getExecutiveKPIs: (token: string) => request<ExecutiveKPIs>('/kpis/executive', {}, token),
  getAreaKPIs: (token: string, areaId: number) =>
    request<AreaKPIs>(`/kpis/area/${areaId}`, {}, token),
  getMachineKPIs: (token: string, machineId: number) =>
    request<MachineKPIs>(`/kpis/machine/${machineId}`, {}, token),
  getSupervisorDaily: (token: string) =>
    request<SupervisorDailyKPIs>('/kpis/supervisor/daily', {}, token),
  getAuditLogs: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<AuditLogEntry[]>(`/audit/logs${qs}`, {}, token)
  },
  getRecordTrace: (token: string, recordId: number) =>
    request<RecordTraceability>(`/audit/record/${recordId}`, {}, token),
  getMecanicos: (token: string) => request<MechanicUser[]>('/users/mecanicos', {}, token),
  getReportPreview: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<ReportPreview>(`/reports/preview${qs}`, {}, token)
  },
  uploadEvidence: async (token: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ evidencia_url: string }>('/lubrication-records/upload-evidence', {
      method: 'POST',
      body: form,
      headers: {},
    }, token)
  },
  exportPdf: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return fetch(`${API_BASE}/reports/export/pdf${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  exportExcel: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return fetch(`${API_BASE}/reports/export/excel${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
