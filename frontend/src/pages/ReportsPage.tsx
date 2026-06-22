import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ConnectionBanner from '../components/ConnectionBanner'
import EvidenceViewer from '../components/EvidenceViewer'
import ReportKpiSummary from '../components/ReportKpiSummary'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { AreaIcon } from '../lib/areaIcons'
import type { Area, Machine, ReportPreview, ReportPreviewRow } from '../types'

export default function ReportsPage() {
  const { user } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [areaId, setAreaId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [preview, setPreview] = useState<ReportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    if (!user) return
    api.getAreas(user.token).then(setAreas)
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!areaId) {
      setMachines([])
      setMachineId('')
      return
    }
    api.getMachines(user.token, { areaId: Number(areaId) }).then(setMachines)
    setMachineId('')
  }, [user, areaId])

  const params = () => {
    const p: Record<string, string> = {}
    if (areaId) p.area_id = areaId
    if (machineId) p.machine_id = machineId
    if (fechaInicio) p.fecha_inicio = fechaInicio
    if (fechaFin) p.fecha_fin = fechaFin
    return p
  }

  const loadPreview = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await api.getReportPreview(user.token, params())
      setPreview(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
  }, [user, areaId, machineId, fechaInicio, fechaFin])

  const download = async (type: 'pdf' | 'excel') => {
    if (!user) return
    setExporting(type)
    try {
      const fetcher = type === 'pdf' ? api.exportPdf : api.exportExcel
      const res = await fetcher(user.token, params())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_ejecutivo_lubricaciones.${type === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  const periodLabel = () => {
    if (!preview) return ''
    const { fecha_inicio, fecha_fin } = preview.meta.filtros
    if (fecha_inicio && fecha_fin) return `${fecha_inicio} → ${fecha_fin}`
    if (fecha_inicio) return `Desde ${fecha_inicio}`
    if (fecha_fin) return `Hasta ${fecha_fin}`
    return 'Período completo'
  }

  return (
    <div className="pb-8">
      <ConnectionBanner />

      {/* Cabecera ejecutiva */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#004A99] to-[#0c2340] text-white p-6 sm:p-8 mb-6 shadow-xl shadow-[#004A99]/20">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#F39200] blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-32 rounded-full bg-cyan-400 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F39200] mb-1">
                SHEKINA S-MART LUB
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Reporte Ejecutivo
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-lg">
                Trazabilidad detallada de lubricaciones — áreas, encargados, evidencia y observaciones
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => download('pdf')}
                disabled={!!exporting}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold backdrop-blur transition disabled:opacity-50"
              >
                {exporting === 'pdf' ? 'Generando…' : 'PDF ejecutivo'}
              </button>
              <button
                onClick={() => download('excel')}
                disabled={!!exporting}
                className="px-4 py-2.5 rounded-xl bg-[#F39200] hover:bg-[#e08500] text-sm font-semibold shadow-lg shadow-[#F39200]/30 transition disabled:opacity-50"
              >
                {exporting === 'excel' ? 'Generando…' : 'Excel'}
              </button>
            </div>
          </div>

          {preview && (
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <MetaChip label="Generado" value={preview.meta.generado_en} />
              <MetaChip label="Responsable" value={preview.meta.generado_por} />
              <MetaChip label="Período" value={periodLabel()} />
              <MetaChip
                label="Alcance"
                value={`${preview.meta.filtros.area} · ${preview.meta.filtros.maquina}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="app-card p-5 mb-6 border border-slate-100 shadow-sm">
        <p className="app-section-title flex items-center gap-2">
          <IconFilter />
          Parámetros del informe
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Área</label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="field-input">
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Máquina</label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="field-input"
              disabled={!areaId}
            >
              <option value="">{areaId ? 'Todas las máquinas' : 'Seleccione área primero'}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.tag})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="field-input" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 text-sm py-12 justify-center">
          <span className="w-5 h-5 border-2 border-[#004A99] border-t-transparent rounded-full animate-spin" />
          Compilando informe ejecutivo…
        </div>
      ) : preview && (
        <>
          <ReportKpiSummary preview={preview} />

          {preview.resumen_areas.length > 1 && (
            <section className="mb-6">
              <p className="app-section-title mb-3">Desglose por área</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {preview.resumen_areas.map((a, i) => (
                  <div
                    key={a.area}
                    className="app-card p-4 flex items-center gap-3 border border-slate-100 hover:border-[#004A99]/30 transition"
                  >
                    <AreaIcon nombre={a.area} index={i} size="md" className="bg-[#004A99]/10 text-[#004A99]" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-800 truncate">{a.area}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {a.total} registros · {a.validados} validados · {a.consumo.toFixed(1)} u.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="app-section-title mb-3">
            Detalle de registros
            <span className="text-slate-400 font-normal ml-2">({preview.rows.length})</span>
          </p>

          {preview.rows.length === 0 ? (
            <p className="app-empty">Sin registros para los filtros seleccionados.</p>
          ) : (
            <div className="space-y-4">
              {preview.rows.map((row) => (
                <ReportRecordCard key={row.id} row={row} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2 backdrop-blur border border-white/10">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium truncate mt-0.5">{value}</p>
    </div>
  )
}

function ReportRecordCard({ row }: { row: ReportPreviewRow }) {
  return (
    <article className="app-card overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="p-3 sm:p-4 sm:w-52 md:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/40">
          <EvidenceViewer
            antes={row.evidencia_antes_url}
            durante={row.evidencia_durante_url}
            despues={row.evidencia_despues_url}
            url={row.evidencia_url}
            compact
          />
        </div>
        <div className="p-4 flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/registros/${row.id}`}
                  className="text-lg font-bold text-[#004A99] hover:underline"
                >
                  OT {row.ot}
                </Link>
                <StatusBadge label={row.estado} />
                {row.evidencia_completa ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <IconCamera />
                    3 fotos
                  </span>
                ) : row.tiene_evidencia ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    <IconCamera />
                    Evidencia parcial
                  </span>
                ) : null}
              </div>
              <p className="font-semibold text-slate-800 mt-1">{row.maquina}</p>
              {row.machine_tag && (
                <p className="text-xs text-slate-400 font-mono">TAG {row.machine_tag}</p>
              )}
            </div>
            <div className="text-right text-xs text-slate-500 shrink-0">
              <p className="inline-flex items-center gap-1 font-medium text-slate-700">
                <IconCalendar />
                {row.fecha}
              </p>
              <p className="inline-flex items-center gap-1 mt-0.5">
                <IconClock />
                {row.hora || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Chip icon={<IconLocation />} label={row.area} />
            <Chip
              icon={<IconDroplet />}
              label={`${row.lubricante} (${row.lubricante_codigo}) — ${row.cantidad} ${row.unidad}`}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
            <PersonBlock
              role="Mecánico"
              name={row.responsable}
              accent="bg-blue-50 text-[#004A99]"
            />
            <PersonBlock
              role="Supervisor"
              name={row.supervisor || 'Sin asignar'}
              accent="bg-amber-50 text-amber-800"
              sub={row.fecha_validacion ? `Validado ${formatDate(row.fecha_validacion)}` : undefined}
            />
          </div>

          {row.observaciones && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Observaciones
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{row.observaciones}</p>
            </div>
          )}

          {row.comentario_supervisor && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                Comentario supervisor
              </p>
              <p className="text-sm text-amber-900 leading-relaxed">{row.comentario_supervisor}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg">
      {icon}
      {label}
    </span>
  )
}

function PersonBlock({
  role,
  name,
  accent,
  sub,
}: {
  role: string
  name: string
  accent: string
  sub?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <IconUser />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{role}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

function IconFilter() {
  return (
    <svg className="w-4 h-4 text-[#004A99]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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

function IconClock() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function IconUser() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
