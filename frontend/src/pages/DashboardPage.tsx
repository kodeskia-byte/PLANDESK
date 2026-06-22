import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AreaCard from '../components/AreaCard'
import ComplianceBadge from '../components/ComplianceBadge'
import ConnectionBanner from '../components/ConnectionBanner'
import DailyPlan from '../components/DailyPlan'
import KpiCard from '../components/KpiCard'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { countPending, getPendingRecords, type PendingRecord } from '../lib/db'
import type { Area, ExecutiveKPIs, KPIs, LubricationRecord, Machine, SupervisorDailyKPIs } from '../types'

const MACHINE_PRIORITY: Record<string, number> = {
  atrasado: 0,
  sin_registro: 1,
  proximo: 2,
  al_dia: 3,
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const ROLE_SUBTITLES: Record<string, string> = {
  mecanico: 'Operaciones en terreno — registra lubricaciones',
  supervisor: 'Revisa y valida registros de tu equipo',
  ito: 'Análisis ejecutivo y reportes consolidados',
  admin: 'Administración y control general',
}

export default function DashboardPage() {
  const { user, isOnline } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [executive, setExecutive] = useState<ExecutiveKPIs | null>(null)
  const [daily, setDaily] = useState<SupervisorDailyKPIs | null>(null)
  const [pending, setPending] = useState(0)
  const [machines, setMachines] = useState<Machine[]>([])
  const [records, setRecords] = useState<LubricationRecord[]>([])
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([])

  useEffect(() => {
    if (!user) return
    countPending().then(setPending)
    getPendingRecords().then(setPendingRecords)

    if (!isOnline) return

    api.getAreas(user.token).then(setAreas).catch(() => {})

    if (user.rol === 'mecanico') {
      Promise.all([
        api.getMachines(user.token),
        api.getRecords(user.token),
      ])
        .then(([m, r]) => {
          setMachines(m)
          setRecords(r)
        })
        .catch(() => {})
    } else {
      api.getMachines(user.token).then(setMachines).catch(() => {})
      if (user.rol === 'supervisor' || user.rol === 'admin') {
        api.getRecords(user.token).then(setRecords).catch(() => {})
      }
    }

    if (user.rol === 'supervisor' || user.rol === 'admin') {
      api.getSupervisorDaily(user.token).then(setDaily).catch(() => {})
    }
    if (user.rol === 'ito' || user.rol === 'admin') {
      api.getExecutiveKPIs(user.token).then(setExecutive).catch(() => {})
    }
    if (user.rol !== 'mecanico') {
      api.getKPIs(user.token).then(setKpis).catch(() => {})
    }
  }, [user, isOnline])

  const rol = user?.rol || 'mecanico'
  const showSupervisorDaily = rol === 'supervisor' || rol === 'admin'
  const showExecutive = rol === 'ito' || rol === 'admin'

  const areaGridItems = useMemo(() => {
    const urgentByArea = new Map<number, number>()
    for (const m of machines) {
      if (m.cumplimiento && m.cumplimiento !== 'al_dia') {
        urgentByArea.set(m.area_id, (urgentByArea.get(m.area_id) || 0) + 1)
      }
    }
    return areas.map((area) => {
      const areaMachines = machines.filter((m) => m.area_id === area.id)
      return {
        area,
        urgent: urgentByArea.get(area.id) || 0,
        total: rol === 'mecanico' ? areaMachines.length : area.machine_count,
      }
    })
  }, [areas, machines, rol])

  const mechanicStats = useMemo(() => {
    const today = todayStr()
    const allRecords = [
      ...records,
      ...pendingRecords.map((p) => ({
        ...p,
        estado_validacion: 'local',
        id: undefined,
      })),
    ]

    const urgentMachines = [...machines]
      .filter((m) => m.cumplimiento && m.cumplimiento !== 'al_dia')
      .sort(
        (a, b) =>
          (MACHINE_PRIORITY[a.cumplimiento || 'al_dia'] ?? 9) -
          (MACHINE_PRIORITY[b.cumplimiento || 'al_dia'] ?? 9)
      )

    const machinesByArea = areas.map((area) => {
      const areaMachines = machines.filter((m) => m.area_id === area.id)
      const urgent = areaMachines.filter((m) => m.cumplimiento && m.cumplimiento !== 'al_dia').length
      return { area, urgent, total: areaMachines.length }
    })

    return {
      registrosHoy: allRecords.filter((r) => r.fecha_registro === today).length,
      pendientesValidacion: records.filter((r) => r.estado_validacion === 'pendiente').length,
      validados: records.filter((r) => r.estado_validacion === 'validado').length,
      correcciones: records.filter((r) => r.estado_validacion === 'correccion_solicitada').length,
      rechazados: records.filter((r) => r.estado_validacion === 'rechazado').length,
      totalRegistros: allRecords.length,
      urgentMachines,
      recentRecords: allRecords.slice(0, 5),
      machinesByArea,
      totalMachines: machines.length,
      alDia: machines.filter((m) => m.cumplimiento === 'al_dia').length,
    }
  }, [areas, machines, records, pendingRecords])

  return (
    <div>
      <ConnectionBanner />

      <PageHeader
        title={`Hola, ${user?.nombre ?? ''}`}
        subtitle={ROLE_SUBTITLES[rol]}
      />

      {/* Dashboard mecánico */}
      {rol === 'mecanico' && (
        <>
          <div className="app-card p-4 mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isOnline ? 'Conectado — datos actualizados' : 'Sin conexión — solo registros locales visibles'}
              </p>
            </div>
            <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${isOnline ? 'bg-[#4CAF50]/15 text-[#2e7d32]' : 'bg-red-50 text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard title="Registros hoy" value={mechanicStats.registrosHoy} color="blue" />
            <KpiCard
              title="Máquinas"
              value={mechanicStats.totalMachines}
              subtitle={`${mechanicStats.alDia} al día`}
              color="green"
            />
            <KpiCard
              title="Pend. validación"
              value={mechanicStats.pendientesValidacion}
              color={mechanicStats.pendientesValidacion > 0 ? 'amber' : 'green'}
            />
            <KpiCard
              title="Por sincronizar"
              value={pending}
              color={pending > 0 ? 'amber' : 'green'}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="app-card p-3 text-center">
              <p className="text-lg font-bold text-[#2e7d32]">{mechanicStats.validados}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Validados</p>
            </div>
            <div className="app-card p-3 text-center">
              <p className="text-lg font-bold text-[#004A99]">{mechanicStats.correcciones}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Correcciones</p>
            </div>
            <div className="app-card p-3 text-center">
              <p className="text-lg font-bold text-red-600">{mechanicStats.rechazados}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Rechazados</p>
            </div>
          </div>

          {(mechanicStats.correcciones > 0 || mechanicStats.rechazados > 0) && (
            <div className="app-card border-amber-200 bg-amber-50 p-4 mb-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">Requieren tu atención</p>
              <div className="flex flex-wrap gap-2">
                {mechanicStats.correcciones > 0 && (
                  <Link
                    to="/historial?estado=correccion_solicitada"
                    className="text-xs bg-white border border-amber-200 text-amber-900 px-3 py-1.5 rounded-full font-medium hover:bg-amber-100"
                  >
                    {mechanicStats.correcciones} corrección(es) pendiente(s) →
                  </Link>
                )}
                {mechanicStats.rechazados > 0 && (
                  <Link
                    to="/historial?estado=rechazado"
                    className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-full font-medium hover:bg-red-50"
                  >
                    {mechanicStats.rechazados} registro(s) rechazado(s) →
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <DailyPlan
              machines={machines}
              corrections={records.filter((r) => r.estado_validacion === 'correccion_solicitada')}
              maxItems={8}
            />
          </div>

          {mechanicStats.recentRecords.length > 0 && (
            <section className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <p className="app-section-title">Actividad reciente</p>
                <Link to="/historial" className="text-xs text-[#004A99] font-medium">Ver todo →</Link>
              </div>
              <div className="space-y-2">
                {mechanicStats.recentRecords.map((r, i) => (
                  <Link
                    key={r.id ?? r.uuid_local ?? i}
                    to={r.id ? `/registros/${r.id}` : '/historial'}
                    className="app-card-hover p-3 flex justify-between items-center gap-2 block"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        OT {r.ot} — {r.machine_nombre || `Máquina #${r.machine_id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.fecha_registro} {r.hora_registro}
                        {r.area_nombre && ` · ${r.area_nombre}`}
                      </p>
                    </div>
                    <StatusBadge label={r.estado_validacion || 'pendiente'} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!isOnline && pendingRecords.length > 0 && (
            <div className="app-card border-[#F39200]/30 bg-[#F39200]/5 p-4 mb-4">
              <p className="text-sm font-semibold text-[#c67600]">
                {pendingRecords.length} registro(s) guardado(s) localmente
              </p>
              <p className="text-xs text-slate-500 mt-1">Se sincronizarán al recuperar conexión.</p>
            </div>
          )}
        </>
      )}

      {showSupervisorDaily && daily && (
        <>
          <p className="app-section-title mb-2">
            {rol === 'admin' ? 'Resumen operativo del día' : 'Resumen del día'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <KpiCard title="Registros hoy" value={daily.registros_hoy} color="blue" />
            <KpiCard title="Pend. validación" value={daily.pendientes_validacion} color="amber" />
            <KpiCard title="Validados hoy" value={daily.validados_hoy} color="green" />
            <KpiCard title="Rechazados hoy" value={daily.rechazados_hoy} color="red" />
            <KpiCard title="Correcciones" value={daily.correcciones_pendientes} color="blue" />
          </div>
          {Object.keys(daily.registros_por_area_hoy).length > 0 && (
            <div className="app-card p-4 mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Registros hoy por área</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(daily.registros_por_area_hoy).map(([area, count]) => (
                  <span key={area} className="text-sm bg-[#004A99]/10 text-[#004A99] px-3 py-1 rounded-full font-medium">
                    {area}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {records.filter((r) => r.estado_validacion === 'pendiente').length > 0 && (
            <div className="app-card border-amber-200 bg-amber-50 p-4 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-2">
                {records.filter((r) => r.estado_validacion === 'pendiente').length} registro(s) esperan validación
              </p>
              <Link to="/validacion" className="text-xs text-[#004A99] font-medium">
                Ir a validación →
              </Link>
            </div>
          )}
        </>
      )}

      {showExecutive && executive && (
        <>
          <p className="app-section-title mb-2">
            {rol === 'admin' ? 'Vista ejecutiva' : 'Cumplimiento y alertas'}
          </p>
          <div className="app-card p-5 mb-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#4CAF50" strokeWidth="3"
                  strokeDasharray={`${executive.cumplimiento_general} ${100 - executive.cumplimiento_general}`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-base text-[#2e7d32]">
                {executive.cumplimiento_general}%
              </span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-slate-800">Cumplimiento general</p>
              <p className="text-sm text-slate-500">
                {executive.maquinas_al_dia} / {executive.total_maquinas} máquinas al día
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KpiCard title="Alertas" value={executive.alertas_maquinas.length} color="red" />
            <KpiCard title="Áreas activas" value={executive.ranking_areas.length} color="blue" />
            <KpiCard title="Mecánicos" value={executive.ranking_mecanicos.length} color="green" />
            <KpiCard title="Consumo elevado" value={executive.areas_consumo_elevado.length} color="amber" />
          </div>
          {executive.alertas_maquinas.length > 0 && (
            <div className="app-card border-red-200 bg-red-50 p-4 mb-6">
              <p className="text-xs font-semibold text-red-600 uppercase mb-2">Alertas prioritarias</p>
              <div className="space-y-2">
                {executive.alertas_maquinas.slice(0, 3).map((a) => (
                  <Link
                    key={a.machine_id}
                    to={`/maquinas/${a.machine_id}`}
                    className="flex justify-between items-center bg-white rounded-xl px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{a.nombre}</span>
                    <ComplianceBadge status={a.cumplimiento} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {kpis && (rol === 'supervisor' || (showExecutive && !executive)) && (
        <>
          <p className="app-section-title mb-2">Resumen general</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard title="Total lubricaciones" value={kpis.total_lubricaciones} color="blue" />
            <KpiCard title="Pend. validación" value={kpis.pendientes_validacion} color="amber" />
            <KpiCard title="Validados" value={kpis.validados} color="green" />
            <KpiCard title="Consumo total" value={kpis.consumo_total} color="blue" />
          </div>
        </>
      )}

      {/* Acciones rápidas por perfil */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(rol === 'mecanico' || rol === 'admin') && (
          <Link to="/registro" className="app-btn-accent">
            + Nueva Lubricación
          </Link>
        )}
        {(rol === 'supervisor' || rol === 'admin') && (
          <Link to="/validacion" className="app-btn-primary">
            Validar registros
          </Link>
        )}
        {(rol === 'supervisor' || rol === 'ito' || rol === 'admin') && (
          <Link to="/reportes" className="app-btn-outline">Reportes</Link>
        )}
        {(rol === 'supervisor' || rol === 'ito' || rol === 'admin') && (
          <Link
            to="/kpis"
            className={rol === 'ito' || rol === 'admin' ? 'app-btn-primary' : 'app-btn-outline'}
          >
            KPIs
          </Link>
        )}
        {(rol === 'ito' || rol === 'admin') && (
          <Link to="/auditoria" className="app-btn-outline">Auditoría</Link>
        )}
        {rol === 'admin' && (
          <Link to="/admin" className="app-btn-outline">Administración</Link>
        )}
        <Link to="/areas" className="app-btn-outline">Ver Áreas</Link>
      </div>

      {/* Grid de áreas */}
      {areas.length > 0 && (
        <section>
          <p className="app-section-title mb-3">
            {rol === 'mecanico' ? 'Tus áreas de trabajo' : 'Áreas bajo tu responsabilidad'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {areaGridItems.map((item, i) => (
              <AreaCard
                key={item.area.id}
                area={{
                  ...item.area,
                  machine_count: item.total || item.area.machine_count,
                }}
                index={i}
                urgentCount={item.urgent}
                to={`/areas/${item.area.id}`}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Alertas ITO / Supervisor */}
      {kpis && kpis.maquinas_sin_lubricacion_reciente.length > 0 && rol !== 'mecanico' && (
        <div className="app-card border-red-200 bg-red-50 p-4 mt-6">
          <h3 className="font-semibold text-red-600 text-sm mb-2">⚠ Máquinas sin lubricación reciente</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {kpis.maquinas_sin_lubricacion_reciente.slice(0, 5).map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
