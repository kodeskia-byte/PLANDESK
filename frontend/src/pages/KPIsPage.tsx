import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ComplianceBadge from '../components/ComplianceBadge'
import ConnectionBanner from '../components/ConnectionBanner'
import KpiCard from '../components/KpiCard'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { Area, AreaKPIs, ExecutiveKPIs, KPIs, SupervisorDailyKPIs } from '../types'

const COLORS = ['#004A99', '#F39200', '#4CAF50', '#ef4444', '#6366f1']

export default function KPIsPage() {
  const { user, isOnline } = useAuth()
  const [executive, setExecutive] = useState<ExecutiveKPIs | null>(null)
  const [general, setGeneral] = useState<KPIs | null>(null)
  const [daily, setDaily] = useState<SupervisorDailyKPIs | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedArea, setSelectedArea] = useState('')
  const [areaKpis, setAreaKpis] = useState<AreaKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isExecutiveRole = user?.rol === 'ito' || user?.rol === 'admin'

  useEffect(() => {
    if (!user || !isOnline) return
    setLoading(true)
    setError('')

    const tasks: Promise<void>[] = [
      api.getAreas(user.token).then(setAreas),
      api.getKPIs(user.token).then(setGeneral).catch(() => {}),
    ]

    if (isExecutiveRole) {
      tasks.push(
        api.getExecutiveKPIs(user.token).then(setExecutive).catch(() => {
          setError('No se pudieron cargar los KPIs ejecutivos.')
        }),
      )
    } else {
      tasks.push(
        api.getSupervisorDaily(user.token).then(setDaily).catch(() => {
          setError('No se pudieron cargar los KPIs del día.')
        }),
      )
    }

    Promise.all(tasks).finally(() => setLoading(false))
  }, [user, isOnline, isExecutiveRole])

  useEffect(() => {
    if (!user || !isOnline || !selectedArea) {
      setAreaKpis(null)
      return
    }
    api.getAreaKPIs(user.token, Number(selectedArea)).then(setAreaKpis)
  }, [user, isOnline, selectedArea])

  if (loading) {
    return <p className="text-slate-400 text-sm">Cargando KPIs...</p>
  }

  if (isExecutiveRole && !executive) {
    return (
      <div>
        <ConnectionBanner />
        <PageHeader title="Dashboard Ejecutivo" subtitle="KPIs, tendencias y alertas de gestión" />
        <p className="app-empty">{error || 'No hay datos ejecutivos disponibles.'}</p>
      </div>
    )
  }

  if (!isExecutiveRole && !daily && !general) {
    return (
      <div>
        <ConnectionBanner />
        <PageHeader title="KPIs de Supervisión" subtitle="Indicadores operativos del día" />
        <p className="app-empty">{error || 'No hay datos disponibles.'}</p>
      </div>
    )
  }

  return (
    <div>
      <ConnectionBanner />

      {isExecutiveRole && executive ? (
        <ExecutiveDashboard executive={executive} />
      ) : (
        <SupervisorDashboard daily={daily} general={general} />
      )}

      <AreaKpisSection
        areas={areas}
        selectedArea={selectedArea}
        onAreaChange={setSelectedArea}
        areaKpis={areaKpis}
      />
    </div>
  )
}

function ExecutiveDashboard({ executive }: { executive: ExecutiveKPIs }) {
  const consumoData = Object.entries(executive.consumo_por_area).map(([name, value]) => ({ name, value }))

  return (
    <>
      <PageHeader title="Dashboard Ejecutivo" subtitle="KPIs, tendencias y alertas de gestión" />

      <div className="app-card p-5 mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#4CAF50" strokeWidth="3"
              strokeDasharray={`${executive.cumplimiento_general} ${100 - executive.cumplimiento_general}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-bold text-lg text-[#2e7d32]">
            {executive.cumplimiento_general}%
          </span>
        </div>
        <div>
          <p className="font-bold text-slate-800">Cumplimiento de lubricación</p>
          <p className="text-sm text-slate-500 mt-1">
            {executive.maquinas_al_dia} de {executive.total_maquinas} máquinas al día
          </p>
          <Link to="/auditoria" className="text-xs text-[#004A99] font-medium mt-2 inline-block">
            Ver auditoría completa →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard title="Alertas máquinas" value={executive.alertas_maquinas.length} color="red" />
        <KpiCard title="Áreas activas" value={executive.ranking_areas.length} color="blue" />
        <KpiCard title="Mecánicos activos" value={executive.ranking_mecanicos.length} color="green" />
        <KpiCard title="Consumo elevado" value={executive.areas_consumo_elevado.length} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Tendencia semanal">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={executive.tendencia_semanal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke="#004A99" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Tendencia mensual">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={executive.tendencia_mensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="valor" fill="#F39200" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <RankingCard title="Ranking de áreas" items={executive.ranking_areas} />
        <RankingCard title="Ranking de mecánicos" items={executive.ranking_mecanicos} />
      </div>

      {consumoData.length > 0 && (
        <ChartCard title="Consumo por área">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={consumoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {consumoData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {executive.alertas_maquinas.length > 0 && (
        <div className="app-card border-red-200 bg-red-50 p-4 mt-6 mb-6">
          <h3 className="font-semibold text-red-600 mb-3">Alertas de gestión</h3>
          <div className="space-y-2">
            {executive.alertas_maquinas.map((a) => (
              <Link
                key={a.machine_id}
                to={`/maquinas/${a.machine_id}`}
                className="flex justify-between items-center bg-white rounded-xl px-3 py-2 hover:shadow-sm transition"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.nombre}</p>
                  <p className="text-xs text-slate-500">{a.area}</p>
                </div>
                <ComplianceBadge status={a.cumplimiento} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {executive.areas_consumo_elevado.length > 0 && (
        <div className="app-card border-amber-200 bg-amber-50 p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">Áreas con consumo elevado</h3>
          <div className="flex flex-wrap gap-2">
            {executive.areas_consumo_elevado.map((a) => (
              <span key={a} className="text-sm bg-white border border-amber-200 text-amber-900 px-3 py-1 rounded-full">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function SupervisorDashboard({
  daily,
  general,
}: {
  daily: SupervisorDailyKPIs | null
  general: KPIs | null
}) {
  return (
    <>
      <PageHeader title="KPIs de Supervisión" subtitle="Indicadores operativos y validación" />

      {daily && (
        <>
          <p className="app-section-title mb-3">Actividad de hoy</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <KpiCard title="Registros hoy" value={daily.registros_hoy} color="blue" />
            <KpiCard title="Pend. validación" value={daily.pendientes_validacion} color="amber" />
            <KpiCard title="Validados hoy" value={daily.validados_hoy} color="green" />
            <KpiCard title="Rechazados hoy" value={daily.rechazados_hoy} color="red" />
            <KpiCard title="Correcciones" value={daily.correcciones_pendientes} color="amber" />
          </div>

          {Object.keys(daily.registros_por_area_hoy).length > 0 && (
            <div className="app-card p-4 mb-6">
              <p className="app-section-title mb-3">Registros por área hoy</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(daily.registros_por_area_hoy).map(([area, count]) => (
                  <span
                    key={area}
                    className="text-sm bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl"
                  >
                    {area}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {general && (
        <>
          <p className="app-section-title mb-3">Resumen general</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard title="Total lubricaciones" value={general.total_lubricaciones} color="blue" />
            <KpiCard title="Pend. validación" value={general.pendientes_validacion} color="amber" />
            <KpiCard title="Validados" value={general.validados} color="green" />
            <KpiCard title="Consumo total" value={general.consumo_total} color="blue" />
          </div>

          {general.maquinas_sin_lubricacion_reciente.length > 0 && (
            <div className="app-card border-amber-200 bg-amber-50 p-4 mb-6">
              <h3 className="font-semibold text-amber-800 mb-2">Máquinas sin lubricación reciente</h3>
              <div className="flex flex-wrap gap-2">
                {general.maquinas_sin_lubricacion_reciente.map((m) => (
                  <span key={m} className="text-sm bg-white border border-amber-200 text-amber-900 px-3 py-1 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <Link to="/validacion" className="app-btn-primary">Ir a validación</Link>
            <Link to="/reportes" className="app-btn-accent">Ver reportes</Link>
          </div>
        </>
      )}
    </>
  )
}

function AreaKpisSection({
  areas,
  selectedArea,
  onAreaChange,
  areaKpis,
}: {
  areas: Area[]
  selectedArea: string
  onAreaChange: (v: string) => void
  areaKpis: AreaKPIs | null
}) {
  return (
    <div className="app-card p-5 mt-6">
      <p className="app-section-title mb-3">KPIs por área</p>
      <select
        value={selectedArea}
        onChange={(e) => onAreaChange(e.target.value)}
        className="field-input mb-4"
      >
        <option value="">Seleccionar área...</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      {areaKpis && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard title="Lubricaciones" value={areaKpis.total_lubricaciones} />
            <KpiCard title="Consumo" value={areaKpis.consumo_total} color="blue" />
            <KpiCard title="Validados" value={areaKpis.validados} color="green" />
            <KpiCard title="Pendientes" value={areaKpis.pendientes_validacion} color="amber" />
          </div>
          <div className="space-y-2">
            {areaKpis.maquinas.map((m) => (
              <Link
                key={m.machine_id}
                to={`/maquinas/${m.machine_id}`}
                className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 hover:bg-slate-100 transition"
              >
                <div>
                  <p className="text-sm font-medium">{m.nombre}</p>
                  <p className="text-xs text-slate-500">{m.total_lubricaciones} reg. · {m.consumo_total} consumo</p>
                </div>
                <ComplianceBadge status={m.cumplimiento} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="app-card p-4">
      <h3 className="app-section-title mb-3">{title}</h3>
      {children}
    </div>
  )
}

function RankingCard({ title, items }: { title: string; items: { nombre: string; valor: number; extra?: string | null }[] }) {
  return (
    <div className="app-card p-4">
      <h3 className="app-section-title mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li key={item.nombre} className="flex items-center gap-3 text-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-[#F39200] text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{item.nombre}</p>
                {item.extra && <p className="text-xs text-slate-400">{item.extra}</p>}
              </div>
              <span className="font-bold text-[#004A99]">{item.valor}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
