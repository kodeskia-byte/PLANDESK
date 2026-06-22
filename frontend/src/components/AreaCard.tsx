import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getAreaColor } from '../lib/areaColors'
import { AreaIcon, getAreaIconLabel, getAreaIconType } from '../lib/areaIcons'
import type { Area } from '../types'

interface AreaCardProps {
  area: Area
  index: number
  urgentCount?: number
  to?: string
  compact?: boolean
}

export default function AreaCard({ area, index, urgentCount = 0, to, compact = false }: AreaCardProps) {
  const iconType = getAreaIconType(area.nombre, index)
  const colorClass = getAreaColor(index)

  const content = (
    <div
      className={`${colorClass} rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all ${
        compact ? 'p-4 min-h-[108px]' : 'p-5 min-h-[140px]'
      } flex flex-col`}
    >
      <div className="flex items-start gap-3">
        <AreaIcon nombre={area.nombre} index={index} size={compact ? 'sm' : 'md'} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-tight">{area.nombre}</h3>
          <p className="text-[10px] text-white/70 mt-0.5">{getAreaIconLabel(iconType)}</p>
        </div>
      </div>

      {area.descripcion && !compact && (
        <p className="text-xs text-white/75 mt-3 line-clamp-2 leading-relaxed">{area.descripcion}</p>
      )}

      <div className="mt-auto pt-3 flex flex-wrap gap-2">
        <StatChip icon={<IconMachine />} label={`${area.machine_count} máq.`} />
        {urgentCount > 0 && (
          <StatChip icon={<IconAlert />} label={`${urgentCount} urgentes`} highlight />
        )}
        {area.pending_validations > 0 && (
          <StatChip icon={<IconClock />} label={`${area.pending_validations} pend.`} />
        )}
      </div>
    </div>
  )

  if (to) {
    return <Link to={to} className="block">{content}</Link>
  }
  return content
}

function StatChip({
  icon,
  label,
  highlight = false,
}: {
  icon: ReactNode
  label: string
  highlight?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
        highlight ? 'bg-white/25 text-white' : 'bg-white/15 text-white/90'
      }`}
    >
      {icon}
      {label}
    </span>
  )
}

function IconMachine() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
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

/** Vista previa para formulario admin */
export function AreaCardPreview({
  nombre,
  descripcion,
  index = 0,
}: {
  nombre: string
  descripcion?: string
  index?: number
}) {
  const colorClass = getAreaColor(index)
  const displayName = nombre.trim() || 'Nombre del área'
  const iconType = getAreaIconType(displayName, index)

  return (
    <div className={`${colorClass} rounded-2xl p-5 shadow-md`}>
      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mb-3">
        Vista previa — así la verá el mecánico
      </p>
      <div className="flex items-start gap-3">
        <AreaIcon nombre={displayName} index={index} size="md" />
        <div>
          <h3 className="font-bold text-sm">{displayName}</h3>
          <p className="text-[10px] text-white/70 mt-0.5">{getAreaIconLabel(iconType)}</p>
        </div>
      </div>
      <p className="text-xs text-white/75 mt-3 line-clamp-2">
        {descripcion?.trim() || 'Descripción del área (opcional)'}
      </p>
      <div className="mt-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-white/15 text-white/90">
          <IconMachine />
          0 máq.
        </span>
      </div>
    </div>
  )
}
