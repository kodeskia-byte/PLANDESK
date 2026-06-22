import { useEffect, useMemo, useState } from 'react'
import AreaCard from '../components/AreaCard'
import ConnectionBanner from '../components/ConnectionBanner'
import KpiCard from '../components/KpiCard'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { Area, Machine } from '../types'

export default function AreasPage() {
  const { user, isOnline } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)

  const isMecanico = user?.rol === 'mecanico'
  const isSupervisorPlus = user?.rol === 'supervisor' || user?.rol === 'ito' || user?.rol === 'admin'

  useEffect(() => {
    if (!user || !isOnline) {
      setLoading(false)
      return
    }
    Promise.all([
      api.getAreas(user.token),
      api.getMachines(user.token),
    ])
      .then(([a, m]) => {
        setAreas(a)
        setMachines(m)
      })
      .finally(() => setLoading(false))
  }, [user, isOnline])

  const stats = useMemo(() => {
    const urgentByArea = new Map<number, number>()
    for (const m of machines) {
      if (m.cumplimiento && m.cumplimiento !== 'al_dia') {
        urgentByArea.set(m.area_id, (urgentByArea.get(m.area_id) || 0) + 1)
      }
    }
    return {
      totalMachines: machines.length,
      urgentTotal: machines.filter((m) => m.cumplimiento && m.cumplimiento !== 'al_dia').length,
      urgentByArea,
    }
  }, [machines])

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Áreas de trabajo"
        subtitle={
          isMecanico
            ? 'Selecciona el sector donde lubricarás las máquinas'
            : 'Áreas bajo tu responsabilidad'
        }
      />

      {!isOnline ? (
        <div className="app-card p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M8.464 8.464a5 5 0 017.072 0M12 12h.01" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">Sin conexión</p>
          <p className="text-sm text-slate-500 mt-1">Conéctate a internet para ver las áreas actualizadas.</p>
        </div>
      ) : loading ? (
        <p className="text-slate-400 text-sm">Cargando áreas...</p>
      ) : areas.length === 0 ? (
        <p className="app-empty">No tienes áreas asignadas.</p>
      ) : (
        <>
          <div className={`grid gap-3 mb-5 ${isMecanico ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <KpiCard title="Áreas" value={areas.length} color="blue" />
            <KpiCard title="Máquinas" value={stats.totalMachines} color="green" />
            <KpiCard
              title="Por lubricar"
              value={stats.urgentTotal}
              color={stats.urgentTotal > 0 ? 'amber' : 'green'}
            />
            {isSupervisorPlus && (
              <KpiCard
                title="Pend. validación"
                value={areas.reduce((sum, a) => sum + (a.pending_validations || 0), 0)}
                color="amber"
              />
            )}
          </div>

          <p className="app-section-title mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Tus sectores
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {areas.map((area, i) => (
              <AreaCard
                key={area.id}
                area={area}
                index={i}
                urgentCount={stats.urgentByArea.get(area.id) || 0}
                to={`/areas/${area.id}`}
              />
            ))}
          </div>

          <div className="app-card p-4 mt-6 flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-[#004A99]/10 text-[#004A99] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">¿Cómo funciona?</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Toca un área para ver sus máquinas. Las que muestran alerta requieren lubricación pronto.
                Desde cada máquina puedes registrar una lubricación con evidencia fotográfica.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
