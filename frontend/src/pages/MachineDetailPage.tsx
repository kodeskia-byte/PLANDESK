import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import ComplianceBadge from '../components/ComplianceBadge'
import ConnectionBanner from '../components/ConnectionBanner'
import KpiCard from '../components/KpiCard'
import MediaImage from '../components/MediaImage'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { LubricationRecord, Machine, MachineKPIs } from '../types'

const ESTADO_LABELS: Record<string, string> = {
  activa: 'Operativa',
  inactiva: 'Inactiva',
  en_mantencion: 'En mantención',
}

const COMPLIANCE_ACCENT: Record<string, string> = {
  al_dia: 'from-[#2e7d32] to-[#4CAF50]',
  proximo: 'from-[#c67600] to-[#F39200]',
  atrasado: 'from-[#b91c1c] to-[#ef4444]',
  sin_registro: 'from-slate-500 to-slate-600',
}

export default function MachineDetailPage() {
  const { machineId } = useParams()
  const { user, isOnline } = useAuth()
  const [machine, setMachine] = useState<Machine | null>(null)
  const [history, setHistory] = useState<LubricationRecord[]>([])
  const [machineKpis, setMachineKpis] = useState<MachineKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !isOnline || !machineId) {
      setLoading(false)
      return
    }
    const id = Number(machineId)
    setLoading(true)
    Promise.all([
      api.getMachine(user.token, id).then(setMachine),
      api.getRecords(user.token, { machine_id: machineId }).then(setHistory),
      api.getMachineKPIs(user.token, id).then(setMachineKpis).catch(() => setMachineKpis(null)),
    ]).finally(() => setLoading(false))
  }, [user, isOnline, machineId])

  const cycleProgress = useMemo(() => {
    if (!machine?.frecuencia_dias || machine.dias_desde_ultima == null) return null
    return Math.min(100, Math.round((machine.dias_desde_ultima / machine.frecuencia_dias) * 100))
  }, [machine])

  const canRegister = user?.rol === 'mecanico' || user?.rol === 'admin'

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-56 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-100" />
        </div>
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="app-card p-8 text-center">
        <p className="text-slate-500 text-sm">No se pudo cargar la máquina.</p>
        <Link to="/areas" className="text-sm text-[#004A99] font-medium mt-2 inline-block">
          Volver a áreas
        </Link>
      </div>
    )
  }

  const accent = COMPLIANCE_ACCENT[machine.cumplimiento || 'sin_registro'] || COMPLIANCE_ACCENT.sin_registro

  return (
    <div className="pb-6">
      <ConnectionBanner />

      {/* Navegación */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/areas" className="text-slate-400 hover:text-[#004A99] transition">
          Áreas
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          to={`/areas/${machine.area_id}`}
          className="text-slate-400 hover:text-[#004A99] transition truncate max-w-[40%]"
        >
          {machine.area_nombre || 'Área'}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium truncate">{machine.nombre}</span>
      </div>

      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden shadow-lg mb-5">
        {machine.foto_url ? (
          <MediaImage
            src={machine.foto_url}
            alt={machine.nombre}
            className="w-full h-52 sm:h-64 md:h-72"
          />
        ) : (
          <div className="w-full h-52 sm:h-64 md:h-72 bg-gradient-to-br from-[#004A99] to-[#003366] flex items-center justify-center">
            <IconMachineLarge />
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t ${accent} via-black/40 to-transparent opacity-90`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                Equipo industrial
              </p>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight truncate">{machine.nombre}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white/15 backdrop-blur px-2.5 py-1 rounded-lg">
                  <IconTag />
                  {machine.tag}
                </span>
                {machine.codigo_interno && (
                  <span className="text-xs text-white/80 bg-white/10 px-2.5 py-1 rounded-lg">
                    {machine.codigo_interno}
                  </span>
                )}
              </div>
            </div>
            <ComplianceBadge status={machine.cumplimiento} />
          </div>
        </div>
      </section>

      {/* Acción principal */}
      {canRegister && (
        <Link
          to={`/registro?area=${machine.area_id}&machine=${machine.id}`}
          className="app-btn-accent w-full flex items-center justify-center gap-2 py-3.5 mb-5 shadow-md"
        >
          <IconPlus />
          Registrar lubricación
        </Link>
      )}

      {/* Ciclo de lubricación */}
      {machine.frecuencia_dias && (
        <section className="app-card p-4 mb-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Ciclo de lubricación
            </p>
            <span className="text-xs text-slate-400">cada {machine.frecuencia_dias} días</span>
          </div>
          {cycleProgress != null ? (
            <>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    machine.cumplimiento === 'al_dia'
                      ? 'bg-[#4CAF50]'
                      : machine.cumplimiento === 'proximo'
                        ? 'bg-[#F39200]'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${cycleProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-slate-500">
                  {machine.dias_desde_ultima === 0
                    ? 'Lubricada hoy'
                    : `Hace ${machine.dias_desde_ultima} día(s)`}
                </span>
                <span
                  className={
                    machine.cumplimiento === 'atrasado'
                      ? 'text-red-600 font-semibold'
                      : 'text-slate-600 font-medium'
                  }
                >
                  {cycleProgress}% del ciclo
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2 font-medium">
              Sin lubricación registrada — programa la primera intervención
            </p>
          )}
          {machine.last_lubrication_date && (
            <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1">
              <IconClock />
              Última: {new Date(machine.last_lubrication_date).toLocaleString('es-CL')}
            </p>
          )}
        </section>
      )}

      {/* Ficha técnica */}
      <section className="mb-5">
        <p className="app-section-title mb-3">Ficha técnica</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SpecCard
            icon={<IconArea />}
            label="Área"
            value={machine.area_nombre || '—'}
            link={`/areas/${machine.area_id}`}
          />
          <SpecCard
            icon={<IconStatus />}
            label="Estado"
            value={ESTADO_LABELS[machine.estado] || machine.estado}
          />
          {machine.tipo_maquina && (
            <SpecCard icon={<IconType />} label="Tipo" value={machine.tipo_maquina} />
          )}
          {machine.lubricante_recomendado_nombre && (
            <SpecCard
              icon={<IconDroplet />}
              label="Lubricante recomendado"
              value={machine.lubricante_recomendado_nombre}
              highlight
            />
          )}
          {machine.frecuencia_dias && (
            <SpecCard
              icon={<IconCalendar />}
              label="Frecuencia"
              value={`Cada ${machine.frecuencia_dias} días`}
            />
          )}
          {machine.dias_desde_ultima != null && (
            <SpecCard
              icon={<IconClock />}
              label="Desde última"
              value={`${machine.dias_desde_ultima} días`}
            />
          )}
        </div>

        {machine.descripcion && (
          <div className="app-card p-4 mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
              Descripción
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{machine.descripcion}</p>
          </div>
        )}
      </section>

      {/* KPIs */}
      {machineKpis && (
        <section className="mb-6">
          <p className="app-section-title mb-3">Indicadores</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard title="Lubricaciones" value={machineKpis.total_lubricaciones} color="blue" />
            <KpiCard title="Consumo total" value={machineKpis.consumo_total} color="blue" subtitle="Unidades" />
            <KpiCard title="Validados" value={machineKpis.validados} color="green" />
            <KpiCard
              title="Pendientes"
              value={machineKpis.pendientes_validacion}
              color={machineKpis.pendientes_validacion > 0 ? 'amber' : 'green'}
            />
          </div>
        </section>
      )}

      {/* Historial */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="app-section-title">Historial de lubricaciones</p>
          {history.length > 0 && (
            <span className="text-xs text-slate-400">{history.length} registro(s)</span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="app-card p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <IconDroplet />
            </div>
            <p className="text-sm font-medium text-slate-600">Sin registros aún</p>
            <p className="text-xs text-slate-400 mt-1">
              Las lubricaciones de este equipo aparecerán aquí
            </p>
            {canRegister && (
              <Link
                to={`/registro?area=${machine.area_id}&machine=${machine.id}`}
                className="inline-block mt-4 text-sm text-[#004A99] font-semibold hover:underline"
              >
                Registrar la primera lubricación →
              </Link>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[1.15rem] top-3 bottom-3 w-0.5 bg-slate-200 hidden sm:block" />
            <div className="space-y-3">
              {history.map((r, index) => (
                <HistoryItem key={r.id ?? index} record={r} isFirst={index === 0} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function SpecCard({
  icon,
  label,
  value,
  highlight,
  link,
}: {
  icon: ReactNode
  label: string
  value: string
  highlight?: boolean
  link?: string
}) {
  const content = (
    <div
      className={`rounded-xl p-3.5 border h-full ${
        highlight
          ? 'bg-[#004A99]/5 border-[#004A99]/15'
          : 'bg-white border-slate-100 shadow-sm'
      } ${link ? 'hover:border-[#004A99]/30 hover:shadow-md transition' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          highlight ? 'bg-[#004A99]/10 text-[#004A99]' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 leading-snug ${highlight ? 'text-[#004A99]' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  )

  if (link) {
    return (
      <Link to={link} className="block">
        {content}
      </Link>
    )
  }
  return content
}

function HistoryItem({ record: r, isFirst }: { record: LubricationRecord; isFirst: boolean }) {
  const hasFullEvidence =
    (r.evidencia_antes_url && (r.evidencia_durante_url || r.evidencia_url) && r.evidencia_despues_url)
  const hasPartial = !hasFullEvidence && (r.evidencia_url || r.evidencia_antes_url)

  const body = (
    <article
      className={`app-card p-4 relative sm:pl-12 transition ${
        r.id ? 'hover:shadow-md hover:border-[#004A99]/20' : ''
      } ${isFirst ? 'border-l-4 border-l-[#004A99]' : ''}`}
    >
      <div className="hidden sm:flex absolute left-3 top-5 w-6 h-6 rounded-full bg-white border-2 border-[#004A99] items-center justify-center z-10">
        <div className="w-2 h-2 rounded-full bg-[#004A99]" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400 font-medium">
            {r.fecha_registro}
            {r.hora_registro && ` · ${r.hora_registro.slice(0, 5)}`}
          </p>
          <p className="font-bold text-[#004A99] mt-0.5">OT {r.ot}</p>
        </div>
        <StatusBadge label={r.estado_validacion || 'pendiente'} />
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center gap-1.5 text-xs bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg">
          <IconDroplet />
          {r.lubricant_nombre || `Lub #${r.lubricant_id}`} — {r.cantidad} {r.unidad}
        </span>
        {hasFullEvidence && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
            <IconCamera />
            3 fotos
          </span>
        )}
        {hasPartial && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
            <IconCamera />
            Evidencia parcial
          </span>
        )}
      </div>

      {r.observaciones && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 rounded-lg px-2.5 py-2">
          {r.observaciones}
        </p>
      )}

      {r.user_nombre && (
        <p className="text-[10px] text-slate-400 mt-2">Registrado por {r.user_nombre}</p>
      )}
    </article>
  )

  if (r.id) {
    return (
      <Link to={`/registros/${r.id}`} className="block">
        {body}
      </Link>
    )
  }
  return body
}

function IconMachineLarge() {
  return (
    <svg className="w-20 h-20 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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

function IconArea() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconStatus() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconType() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function IconDroplet() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
