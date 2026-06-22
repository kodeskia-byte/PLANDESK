import { Link } from 'react-router-dom'
import ComplianceBadge from './ComplianceBadge'
import {
  buildDailyPlan,
  currentTurno,
  TURNO_LABELS,
  type DailyPlanItem,
} from '../lib/dailyPlan'
import type { LubricationRecord, Machine } from '../types'

interface DailyPlanProps {
  machines: Machine[]
  corrections?: LubricationRecord[]
  maxItems?: number
  showTurno?: boolean
}

export default function DailyPlan({
  machines,
  corrections = [],
  maxItems,
  showTurno = true,
}: DailyPlanProps) {
  const turno = currentTurno()
  const plan = buildDailyPlan(machines, corrections)
  const visible = maxItems ? plan.slice(0, maxItems) : plan

  if (plan.length === 0) {
    return (
      <div className="app-card p-4 text-center">
        <p className="text-sm font-semibold text-[#2e7d32]">¡Ruta al día!</p>
        <p className="text-xs text-slate-500 mt-1">No hay máquinas atrasadas ni correcciones pendientes.</p>
      </div>
    )
  }

  return (
    <section>
      {showTurno && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="app-section-title">Ruta del día</p>
          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#004A99]/10 text-[#004A99] px-2.5 py-1 rounded-full">
            {TURNO_LABELS[turno]}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {visible.map((item, index) => (
          <PlanRow key={itemKey(item, index)} item={item} index={index + 1} />
        ))}
      </div>

      {maxItems && plan.length > maxItems && (
        <p className="text-xs text-slate-400 mt-2 text-center">
          +{plan.length - maxItems} equipo(s) más en la ruta
        </p>
      )}
    </section>
  )
}

function itemKey(item: DailyPlanItem, index: number) {
  if (item.kind === 'correction' && item.record?.id) return `corr-${item.record.id}`
  if (item.machine?.id) return `machine-${item.machine.id}`
  return `plan-${index}`
}

function PlanRow({ item, index }: { item: DailyPlanItem; index: number }) {
  if (item.kind === 'correction' && item.record) {
    const r = item.record
    return (
      <div className="app-card p-3 flex items-center gap-3 border-l-4 border-l-[#004A99]">
        <span className="w-7 h-7 rounded-full bg-[#004A99] text-white text-xs font-bold flex items-center justify-center shrink-0">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#004A99]">Corrección</p>
          <p className="text-sm font-semibold text-slate-800 truncate">
            {r.machine_nombre || `Máquina #${r.machine_id}`}
          </p>
          <p className="text-xs text-slate-500">OT {r.ot} · {r.area_nombre}</p>
          {r.comentario_supervisor && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.comentario_supervisor}</p>
          )}
        </div>
        <Link
          to={`/registro?correction=${r.id}`}
          className="text-xs bg-[#004A99] text-white px-3 py-1.5 rounded-lg font-semibold shrink-0"
        >
          Corregir
        </Link>
      </div>
    )
  }

  const m = item.machine!
  return (
    <div className="app-card p-3 flex items-center gap-3">
      <span className="w-7 h-7 rounded-full bg-[#F39200] text-white text-xs font-bold flex items-center justify-center shrink-0">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{m.nombre}</p>
        <p className="text-xs text-slate-500">
          {m.area_nombre} · TAG {m.tag}
          {m.dias_desde_ultima != null && ` · hace ${m.dias_desde_ultima} días`}
        </p>
      </div>
      <ComplianceBadge status={m.cumplimiento} />
      <Link
        to={`/registro?area=${m.area_id}&machine=${m.id}`}
        className="text-xs bg-[#F39200] text-white px-3 py-1.5 rounded-lg font-semibold shrink-0"
      >
        Registrar
      </Link>
    </div>
  )
}
