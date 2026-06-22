import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import ComplianceBadge from '../components/ComplianceBadge'
import ConnectionBanner from '../components/ConnectionBanner'
import MediaImage from '../components/MediaImage'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { getAreaColor } from '../lib/areaColors'
import { AreaIcon, getAreaIconLabel, getAreaIconType } from '../lib/areaIcons'
import type { Area, Machine } from '../types'

type MachineFilter = 'todas' | 'urgentes' | 'al_dia'

export default function AreaDetailPage() {
  const { areaId } = useParams()
  const { user, isOnline } = useAuth()
  const [area, setArea] = useState<Area | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [filter, setFilter] = useState<MachineFilter>('todas')
  const [areaIndex, setAreaIndex] = useState(0)

  useEffect(() => {
    if (!user || !isOnline || !areaId) return
    const id = Number(areaId)
    api.getArea(user.token, id).then(setArea).catch(() => {})
    api.getMachines(user.token, { areaId: id }).then(setMachines)
    api.getAreas(user.token).then((areas) => {
      const idx = areas.findIndex((a) => a.id === id)
      if (idx >= 0) setAreaIndex(idx)
    })
  }, [user, isOnline, areaId])

  const stats = useMemo(() => ({
    urgentes: machines.filter((m) => m.cumplimiento && m.cumplimiento !== 'al_dia').length,
    alDia: machines.filter((m) => m.cumplimiento === 'al_dia').length,
  }), [machines])

  const filtered = useMemo(() => {
    if (filter === 'urgentes') {
      return machines.filter((m) => m.cumplimiento && m.cumplimiento !== 'al_dia')
    }
    if (filter === 'al_dia') {
      return machines.filter((m) => m.cumplimiento === 'al_dia')
    }
    return machines
  }, [machines, filter])

  const iconType = area ? getAreaIconType(area.nombre, areaIndex) : 'general'

  return (
    <div>
      <ConnectionBanner />
      <PageHeader backTo="/areas" backLabel="Áreas" title="" />

      {area && (
        <div className={`${getAreaColor(areaIndex)} rounded-2xl p-5 mb-5 shadow-md`}>
          <div className="flex items-start gap-4">
            <AreaIcon nombre={area.nombre} index={areaIndex} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight">{area.nombre}</h1>
              <p className="text-xs text-white/70 mt-1">{getAreaIconLabel(iconType)}</p>
              {area.descripcion && (
                <p className="text-sm text-white/85 mt-2 leading-relaxed">{area.descripcion}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <HeaderChip icon={<IconMachine />} label={`${machines.length} máquinas`} />
            {stats.urgentes > 0 && (
              <HeaderChip icon={<IconAlert />} label={`${stats.urgentes} por lubricar`} warn />
            )}
            <HeaderChip icon={<IconCheck />} label={`${stats.alDia} al día`} />
          </div>
        </div>
      )}

      {!area && (
        <PageHeader title="Máquinas del área" subtitle={`${machines.length} equipos`} />
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([
          { id: 'todas' as const, label: 'Todas', count: machines.length },
          { id: 'urgentes' as const, label: 'Por lubricar', count: stats.urgentes },
          { id: 'al_dia' as const, label: 'Al día', count: stats.alDia },
        ]).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
              filter === f.id
                ? 'bg-[#004A99] text-white'
                : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="app-card p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <IconMachine />
          </div>
          <p className="text-sm text-slate-500">
            {filter === 'urgentes'
              ? '¡Buen trabajo! No hay máquinas pendientes en esta área.'
              : 'No hay máquinas en este filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <Link
              key={m.id}
              to={`/maquinas/${m.id}`}
              className="app-card-hover overflow-hidden flex flex-col"
            >
              <div className="relative">
                <MediaImage src={m.foto_url} alt={m.nombre} className="w-full h-32" />
                <div className="absolute top-2 right-2">
                  <ComplianceBadge status={m.cumplimiento} />
                </div>
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-800">{m.nombre}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <IconTag />
                    {m.tag}
                  </span>
                  {m.frecuencia_dias && (
                    <span className="inline-flex items-center gap-1">
                      <IconCalendar />
                      cada {m.frecuencia_dias}d
                    </span>
                  )}
                </div>
                {m.last_lubrication_date ? (
                  <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1">
                    <IconClock />
                    Última: {new Date(m.last_lubrication_date).toLocaleDateString('es-CL')}
                    {m.dias_desde_ultima != null && ` (hace ${m.dias_desde_ultima} días)`}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-2 font-medium">Sin lubricación registrada</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {(user?.rol === 'mecanico' || user?.rol === 'admin') && (
        <Link
          to={`/registro?area=${areaId}`}
          className="inline-flex items-center gap-2 mt-5 app-btn-accent"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Registrar lubricación en esta área
        </Link>
      )}
    </div>
  )
}

function HeaderChip({
  icon,
  label,
  warn = false,
}: {
  icon: ReactNode
  label: string
  warn?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
        warn ? 'bg-white/25 text-white' : 'bg-white/15 text-white/90'
      }`}
    >
      {icon}
      {label}
    </span>
  )
}

function IconMachine() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
