import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ConnectionBanner from '../components/ConnectionBanner'
import EvidenceViewer from '../components/EvidenceViewer'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { Area, LubricationRecord, Machine, MechanicUser } from '../types'

type Tab = 'pendiente' | 'correccion_solicitada' | 'todos'

export default function ValidationPage() {
  const { user, isOnline } = useAuth()
  const [records, setRecords] = useState<LubricationRecord[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [mecanicos, setMecanicos] = useState<MechanicUser[]>([])
  const [comment, setComment] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('pendiente')
  const [areaId, setAreaId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [mecanicoId, setMecanicoId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!user || !isOnline) return
    api.getAreas(user.token).then(setAreas)
    api.getMecanicos(user.token).then(setMecanicos)
  }, [user, isOnline])

  useEffect(() => {
    if (!user || !isOnline || !areaId) {
      setMachines([])
      return
    }
    api.getMachines(user.token, { areaId: Number(areaId) }).then(setMachines)
  }, [user, isOnline, areaId])

  const load = useCallback(() => {
    if (!user || !isOnline) return
    const params: Record<string, string> = {}
    if (tab !== 'todos') params.estado_validacion = tab
    if (areaId) params.area_id = areaId
    if (machineId) params.machine_id = machineId
    if (mecanicoId) params.user_id = mecanicoId
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    api.getRecords(user.token, params).then(setRecords)
  }, [user, isOnline, tab, areaId, machineId, mecanicoId, fechaInicio, fechaFin])

  useEffect(load, [load])

  const act = async (id: number, action: 'validate' | 'reject' | 'correction') => {
    if (!user) return
    if (action !== 'validate' && !comment[id]?.trim()) {
      alert('Ingresa un comentario para rechazar o solicitar corrección')
      return
    }
    setLoading(id)
    if (action === 'validate') await api.validateRecord(user.token, id, comment[id])
    else if (action === 'reject') await api.rejectRecord(user.token, id, comment[id])
    else await api.requestCorrection(user.token, id, comment[id])
    load()
    setLoading(null)
  }

  const tabLabels: { id: Tab; label: string }[] = [
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'correccion_solicitada', label: 'Corrección' },
    { id: 'todos', label: 'Todos' },
  ]

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Validación de registros"
        subtitle={`${records.length} registro(s) en bandeja`}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabLabels.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-2 rounded-xl font-medium whitespace-nowrap transition ${
              tab === t.id ? 'bg-[#004A99] text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm px-4 py-2 rounded-xl font-medium bg-white border border-slate-200 text-slate-500 ml-auto shrink-0"
        >
          {showFilters ? '▲ Filtros' : '▼ Filtros'}
        </button>
      </div>

      {showFilters && (
        <div className="app-card p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <FilterSelect label="Área" value={areaId} onChange={(v) => { setAreaId(v); setMachineId('') }}>
            <option value="">Todas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </FilterSelect>
          <FilterSelect label="Máquina" value={machineId} onChange={setMachineId} disabled={!areaId}>
            <option value="">Todas</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </FilterSelect>
          <FilterSelect label="Mecánico" value={mecanicoId} onChange={setMecanicoId}>
            <option value="">Todos</option>
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
            ))}
          </FilterSelect>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Desde</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="field-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Hasta</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="field-input mt-1" />
            </div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="app-empty">
          <p className="text-[#4CAF50] font-semibold mb-1">✓ Sin registros</p>
          <p>No hay registros con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div
              key={r.id}
              className={`app-card p-4 border-l-4 ${
                r.estado_validacion === 'correccion_solicitada'
                  ? 'border-l-[#004A99]'
                  : 'border-l-[#F39200]'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{r.machine_nombre} — {r.area_nombre}</p>
                    <StatusBadge label={r.estado_validacion || 'pendiente'} />
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {r.fecha_registro} — OT: {r.ot} — {r.user_nombre}
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    {r.lubricant_nombre}: <strong>{r.cantidad} {r.unidad}</strong>
                  </p>
                  {r.observaciones && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                      Obs: {r.observaciones}
                    </p>
                  )}
                </div>
                {r.id && (
                  <Link to={`/registros/${r.id}`} className="text-xs text-[#004A99] font-medium shrink-0">
                    Detalle →
                  </Link>
                )}
              </div>

              <div className="mt-3">
                <EvidenceViewer
                  antes={r.evidencia_antes_url}
                  durante={r.evidencia_durante_url}
                  despues={r.evidencia_despues_url}
                  url={r.evidencia_url}
                  compact
                />
              </div>

              {tab !== 'todos' && (
                <>
                  <textarea
                    placeholder="Comentario de supervisión"
                    value={comment[r.id!] || ''}
                    onChange={(e) => setComment({ ...comment, [r.id!]: e.target.value })}
                    className="field-input mt-3 text-sm"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => act(r.id!, 'validate')}
                      disabled={loading === r.id}
                      className="flex-1 min-w-[100px] bg-[#4CAF50] text-white font-semibold px-3 py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      ✓ Validar
                    </button>
                    <button
                      onClick={() => act(r.id!, 'correction')}
                      disabled={loading === r.id}
                      className="flex-1 min-w-[100px] bg-[#004A99] text-white font-semibold px-3 py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      ↻ Corrección
                    </button>
                    <button
                      onClick={() => act(r.id!, 'reject')}
                      disabled={loading === r.id}
                      className="flex-1 min-w-[100px] bg-white border-2 border-red-300 text-red-600 font-semibold px-3 py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      ✕ Rechazar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="field-input mt-1 disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  )
}
