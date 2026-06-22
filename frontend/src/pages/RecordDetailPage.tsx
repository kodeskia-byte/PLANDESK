import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ComplianceBadge from '../components/ComplianceBadge'
import EvidenceViewer from '../components/EvidenceViewer'
import MediaImage from '../components/MediaImage'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { AuditLogEntry, LubricationRecord, Machine } from '../types'

const TRACE_LABELS: Record<string, string> = {
  registro_creado: 'Registro creado',
  validado: 'Validado por supervisor',
  rechazado: 'Rechazado',
  correccion_solicitada: 'Corrección solicitada',
  sincronizado: 'Sincronizado',
  sync: 'Sincronización',
}

export default function RecordDetailPage() {
  const { recordId } = useParams()
  const { user, isOnline } = useAuth()
  const [record, setRecord] = useState<LubricationRecord | null>(null)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [trace, setTrace] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !isOnline || !recordId) return
    const id = Number(recordId)
    api.getRecord(user.token, id)
      .then((r) => {
        setRecord(r)
        return Promise.all([
          api.getMachine(user.token, r.machine_id),
          (user.rol === 'ito' || user.rol === 'admin' || user.rol === 'supervisor')
            ? api.getRecordTrace(user.token, id).then((t) => t.eventos).catch(() => [])
            : Promise.resolve([]),
        ])
      })
      .then(([m, events]) => {
        setMachine(m)
        setTrace(events)
      })
      .catch(() => setError('No se pudo cargar el registro'))
  }, [user, isOnline, recordId])

  if (error) return <p className="app-empty">{error}</p>
  if (!record) return <p className="text-slate-400 text-sm">Cargando...</p>

  const isRejected = record.estado_validacion === 'rechazado'
  const needsCorrection = record.estado_validacion === 'correccion_solicitada'

  return (
    <div>
      <PageHeader
        title={`OT: ${record.ot}`}
        subtitle={`${record.machine_nombre} — ${record.area_nombre}`}
        backTo="/historial"
        backLabel="Historial"
      />

      <div className="space-y-4 max-w-lg">
        <div className="app-card p-4 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={record.estado_validacion || 'pendiente'} />
            {record.estado_sincronizacion && (
              <StatusBadge label={record.estado_sincronizacion} />
            )}
          </div>
          <span className="text-sm text-slate-500">
            {record.fecha_registro} {record.hora_registro}
          </span>
        </div>

        {needsCorrection && record.comentario_supervisor && (
          <div className="app-card border-[#004A99]/30 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-[#004A99] mb-1">Corrección solicitada</p>
            <p className="text-sm text-slate-700">{record.comentario_supervisor}</p>
            {record.supervisor_nombre && (
              <p className="text-xs text-slate-500 mt-2">— {record.supervisor_nombre}</p>
            )}
            {(user?.rol === 'mecanico' || user?.rol === 'admin') && record.id && (
              <Link
                to={`/registro?correction=${record.id}`}
                className="inline-block mt-3 app-btn-primary text-sm"
              >
                Corregir este registro
              </Link>
            )}
          </div>
        )}

        {isRejected && record.comentario_supervisor && (
          <div className="app-card border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-600 mb-1">Registro rechazado</p>
            <p className="text-sm text-red-700">{record.comentario_supervisor}</p>
            {record.supervisor_nombre && (
              <p className="text-xs text-red-500 mt-2">— {record.supervisor_nombre}</p>
            )}
          </div>
        )}

        {record.estado_validacion === 'validado' && record.comentario_supervisor && (
          <div className="app-card border-[#4CAF50]/30 bg-[#4CAF50]/5 p-4">
            <p className="text-sm font-semibold text-[#2e7d32] mb-1">Comentario del supervisor</p>
            <p className="text-sm text-slate-700">{record.comentario_supervisor}</p>
          </div>
        )}

        <div className="app-card p-4 space-y-3">
          <DetailRow label="Mecánico" value={record.user_nombre || '—'} />
          <DetailRow label="Lubricante" value={`${record.lubricant_nombre} — ${record.cantidad} ${record.unidad}`} />
          {record.observaciones && (
            <DetailRow label="Observaciones" value={record.observaciones} />
          )}
          {record.fecha_validacion && (
            <DetailRow
              label="Validado"
              value={`${new Date(record.fecha_validacion).toLocaleString('es-CL')}${record.supervisor_nombre ? ` por ${record.supervisor_nombre}` : ''}`}
            />
          )}
        </div>

        <div className="app-card p-4">
          <EvidenceViewer
            antes={record.evidencia_antes_url}
            durante={record.evidencia_durante_url}
            despues={record.evidencia_despues_url}
            url={record.evidencia_url}
          />
        </div>

        {trace.length > 0 && (
          <div className="app-card p-4">
            <p className="app-section-title mb-3">Trazabilidad</p>
            <div className="space-y-3">
              {trace.map((ev, i) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#004A99] shrink-0" />
                    {i < trace.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-3 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {TRACE_LABELS[ev.accion] || ev.accion}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ev.user_nombre || 'Sistema'} · {new Date(ev.created_at).toLocaleString('es-CL')}
                    </p>
                    {ev.detalle && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1.5">
                        {ev.detalle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {machine && (
          <Link to={`/maquinas/${machine.id}`} className="app-card-hover p-4 flex gap-4">
            <MediaImage
              src={machine.foto_url}
              alt={machine.nombre}
              className="w-16 h-16 rounded-xl shrink-0"
            />
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{machine.nombre}</p>
              <p className="text-xs text-slate-500">TAG: {machine.tag}</p>
              <div className="mt-1">
                <ComplianceBadge status={machine.cumplimiento} />
              </div>
            </div>
            <span className="text-[#004A99] text-sm self-center">→</span>
          </Link>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}
