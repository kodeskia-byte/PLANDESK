import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ConnectionBanner from '../components/ConnectionBanner'
import KpiCard from '../components/KpiCard'
import MediaImage from '../components/MediaImage'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { getPendingRecords, type PendingRecord } from '../lib/db'
import type { LubricationRecord } from '../types'

const FILTER_VALUES = ['', 'pendiente', 'validado', 'rechazado', 'correccion_solicitada', 'local'] as const

type FilterValue = (typeof FILTER_VALUES)[number]

type HistoryRecord = LubricationRecord & { estado_validacion?: string }

const FILTERS: { value: FilterValue; label: string; icon: ReactNode; color?: 'blue' | 'green' | 'amber' | 'red' }[] = [
  { value: '', label: 'Todos', icon: <IconList /> },
  { value: 'pendiente', label: 'Pendientes', icon: <IconClock />, color: 'amber' },
  { value: 'validado', label: 'Validados', icon: <IconCheck />, color: 'green' },
  { value: 'correccion_solicitada', label: 'Corrección', icon: <IconRefresh />, color: 'blue' },
  { value: 'rechazado', label: 'Rechazados', icon: <IconX />, color: 'red' },
  { value: 'local', label: 'Offline', icon: <IconCloudOff /> },
]

export default function HistoryPage() {
  const { user, isOnline } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [records, setRecords] = useState<LubricationRecord[]>([])
  const [pending, setPending] = useState<PendingRecord[]>([])
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<FilterValue>(() => {
    const estado = searchParams.get('estado') || ''
    return FILTER_VALUES.includes(estado as FilterValue) ? (estado as FilterValue) : ''
  })

  useEffect(() => {
    if (!user) return
    if (isOnline) {
      api.getRecords(user.token).then(setRecords).catch(() => {})
    }
    getPendingRecords().then(setPending)
  }, [user, isOnline])

  useEffect(() => {
    if (filterEstado) {
      setSearchParams({ estado: filterEstado }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [filterEstado, setSearchParams])

  const combined = useMemo(() => {
    const local = pending.map((p) => ({
      ...p,
      estado_validacion: 'local',
      id: undefined,
    })) as HistoryRecord[]
    return [...local, ...records]
  }, [records, pending])

  const stats = useMemo(() => ({
    total: combined.length,
    validados: combined.filter((r) => r.estado_validacion === 'validado').length,
    pendientes: combined.filter((r) => r.estado_validacion === 'pendiente').length,
    correcciones: combined.filter((r) => r.estado_validacion === 'correccion_solicitada').length,
    rechazados: combined.filter((r) => r.estado_validacion === 'rechazado').length,
    offline: pending.length,
  }), [combined, pending.length])

  const filterCounts = useMemo(() => ({
    '': combined.length,
    pendiente: stats.pendientes,
    validado: stats.validados,
    rechazado: stats.rechazados,
    correccion_solicitada: stats.correcciones,
    local: stats.offline,
  }), [combined.length, stats])

  const filtered = useMemo(() => {
    let list = combined
    if (filterEstado === 'local') {
      list = combined.filter((r) => r.estado_validacion === 'local')
    } else if (filterEstado) {
      list = combined.filter((r) => r.estado_validacion === filterEstado)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.ot?.toLowerCase().includes(q) ||
          r.machine_nombre?.toLowerCase().includes(q) ||
          r.area_nombre?.toLowerCase().includes(q) ||
          r.lubricant_nombre?.toLowerCase().includes(q)
      )
    }

    return list.sort((a, b) => {
      const da = `${a.fecha_registro}T${a.hora_registro || '00:00'}`
      const db = `${b.fecha_registro}T${b.hora_registro || '00:00'}`
      return db.localeCompare(da)
    })
  }, [combined, filterEstado, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const isMecanico = user?.rol === 'mecanico' || user?.rol === 'admin'

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Historial"
        subtitle="Registros de lubricación realizados"
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiCard title="Total" value={stats.total} color="blue" />
        <KpiCard title="Validados" value={stats.validados} color="green" />
        <KpiCard
          title="Pendientes"
          value={stats.pendientes}
          color={stats.pendientes > 0 ? 'amber' : 'green'}
        />
        <KpiCard
          title="Offline"
          value={stats.offline}
          color={stats.offline > 0 ? 'amber' : 'blue'}
        />
      </div>

      {/* Alertas mecánico */}
      {isMecanico && (stats.correcciones > 0 || stats.rechazados > 0) && (
        <div className="app-card border-amber-200 bg-amber-50 p-4 mb-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <IconAlert />
            Requieren tu atención
          </p>
          {stats.correcciones > 0 && (
            <button
              type="button"
              onClick={() => setFilterEstado('correccion_solicitada')}
              className="w-full text-left text-sm bg-white rounded-xl px-3 py-2 border border-amber-200 text-amber-900 hover:bg-amber-100 transition"
            >
              <strong>{stats.correcciones}</strong> registro(s) con corrección solicitada →
            </button>
          )}
          {stats.rechazados > 0 && (
            <button
              type="button"
              onClick={() => setFilterEstado('rechazado')}
              className="w-full text-left text-sm bg-white rounded-xl px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 transition"
            >
              <strong>{stats.rechazados}</strong> registro(s) rechazado(s) →
            </button>
          )}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-3">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <IconSearch />
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por OT, máquina o área..."
          className="field-input pl-10"
        />
      </div>

      {/* Filtros con contadores */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => {
          const count = filterCounts[f.value]
          const active = filterEstado === f.value
          return (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setFilterEstado(f.value)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium whitespace-nowrap transition shrink-0 ${
                active
                  ? 'bg-[#004A99] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-[#004A99]/30'
              }`}
            >
              <span className={active ? 'text-white/90' : 'text-slate-400'}>{f.icon}</span>
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lista agrupada */}
      {filtered.length === 0 ? (
        <div className="app-card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <IconList />
          </div>
          <p className="font-semibold text-slate-700">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay registros con este filtro'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {search ? 'Prueba con otro término o limpia el filtro.' : 'Los registros que crees aparecerán aquí.'}
          </p>
          {isMecanico && !search && (
            <Link to="/registro" className="inline-block mt-4 app-btn-accent text-sm">
              + Nueva lubricación
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <p className="app-section-title mb-3 flex items-center gap-2 sticky top-0 bg-[#f1f5f9] py-1 z-10">
                <IconCalendar />
                {label}
                <span className="text-slate-300 font-normal">({items.length})</span>
              </p>
              <div className="space-y-2">
                {items.map((r, i) => (
                  <RecordRow key={r.id || r.uuid_local || `${label}-${i}`} record={r} isMecanico={isMecanico} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {isMecanico && filtered.length > 0 && (
        <Link
          to="/registro"
          className="fixed bottom-20 sm:bottom-6 right-4 w-14 h-14 bg-[#F39200] text-white rounded-full shadow-lg shadow-[#F39200]/30 flex items-center justify-center hover:scale-105 transition z-30"
          title="Nueva lubricación"
        >
          <IconPlus />
        </Link>
      )}
    </div>
  )
}

function RecordRow({ record: r, isMecanico }: { record: HistoryRecord; isMecanico: boolean }) {
  const needsAction =
    r.estado_validacion === 'correccion_solicitada' || r.estado_validacion === 'rechazado'
  const isLocal = r.estado_validacion === 'local'
  const showCorrection =
    r.estado_validacion === 'correccion_solicitada' && isMecanico

  const body = (
    <div className="flex gap-0">
      <MediaImage
        src={r.machine_foto_url || r.evidencia_url}
        alt={r.machine_nombre || 'Máquina'}
        className="w-20 sm:w-24 shrink-0 min-h-[88px]"
        fallback="⚙️"
      />
      <div className="p-3 flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 truncate">
              {r.machine_nombre || `Máquina #${r.machine_id}`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
              {r.area_nombre && (
                <span className="inline-flex items-center gap-0.5">
                  <IconLocation />
                  {r.area_nombre}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 font-medium text-[#004A99]">
                OT {r.ot}
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <StatusBadge label={r.estado_validacion || 'pendiente'} />
            {r.estado_sincronizacion && r.estado_sincronizacion !== 'sincronizado' && (
              <StatusBadge label={r.estado_sincronizacion} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
            <IconDroplet />
            {r.lubricant_nombre || `Lub #${r.lubricant_id}`} — {r.cantidad} {r.unidad}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <IconClock />
            {r.hora_registro?.slice(0, 5) || '—'}
          </span>
          {(r.evidencia_antes_url && r.evidencia_durante_url && r.evidencia_despues_url) ||
          (r.evidencia_antes_url && r.evidencia_url && r.evidencia_despues_url) ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <IconCamera />
              3 fotos
            </span>
          ) : r.evidencia_url || r.evidencia_antes_url || r.evidencia_durante_url || r.evidencia_despues_url ? (
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <IconCamera />
              Evidencia parcial
            </span>
          ) : null}
        </div>

        {needsAction && r.comentario_supervisor && (
          <p
            className={`text-xs mt-2 rounded-lg px-2.5 py-2 leading-relaxed ${
              r.estado_validacion === 'correccion_solicitada'
                ? 'text-[#004A99] bg-blue-50 border border-[#004A99]/15'
                : 'text-red-700 bg-red-50 border border-red-100'
            }`}
          >
            <span className="font-semibold">Supervisor: </span>
            {r.comentario_supervisor}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div
      className={`app-card overflow-hidden hover:shadow-md transition ${
        needsAction ? 'border-l-4 border-l-[#F39200]' : isLocal ? 'border-l-4 border-l-slate-400' : ''
      }`}
    >
      {r.id ? (
        <Link to={`/registros/${r.id}`} className="block hover:bg-slate-50/50 transition">
          {body}
        </Link>
      ) : (
        body
      )}
      {showCorrection && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100">
          <Link
            to={r.id ? `/registro?correction=${r.id}` : `/registro?area=${r.area_id}&machine=${r.machine_id}`}
            className="text-xs font-semibold text-[#F39200] inline-flex items-center gap-1 hover:underline"
          >
            Corregir registro →
          </Link>
        </div>
      )}
    </div>
  )
}

function groupByDate(records: HistoryRecord[]) {
  const today = todayStr()
  const yesterday = offsetDate(-1)
  const weekAgo = offsetDate(-7)

  const groups: { label: string; items: HistoryRecord[] }[] = []
  const buckets = new Map<string, HistoryRecord[]>()

  for (const r of records) {
    const d = r.fecha_registro
    let label: string
    if (d === today) label = 'Hoy'
    else if (d === yesterday) label = 'Ayer'
    else if (d >= weekAgo) label = 'Esta semana'
    else label = formatMonth(d)

    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label)!.push(r)
  }

  const order = ['Hoy', 'Ayer', 'Esta semana']
  for (const key of order) {
    if (buckets.has(key)) groups.push({ label: key, items: buckets.get(key)! })
  }
  for (const [label, items] of buckets) {
    if (!order.includes(label)) groups.push({ label, items })
  }

  return groups
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function offsetDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatMonth(dateStr: string) {
  const [y, m] = dateStr.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[Number(m) - 1]} ${y}`
}

function IconList() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconCloudOff() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    </svg>
  )
}

function IconDroplet() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
