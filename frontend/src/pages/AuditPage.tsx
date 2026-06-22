import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConnectionBanner from '../components/ConnectionBanner'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { AuditLogEntry } from '../types'

const ACTION_LABELS: Record<string, string> = {
  registro_creado: 'Registro creado',
  validado: 'Validado',
  rechazado: 'Rechazado',
  correccion_solicitada: 'Corrección solicitada',
  correccion_enviada: 'Corrección enviada',
  sincronizado: 'Sincronizado',
  sync: 'Sincronización',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  usuario_creado: 'Usuario creado',
  usuario_actualizado: 'Usuario actualizado',
  pin_reset: 'PIN reiniciado',
  area_creada: 'Área creada',
  area_actualizada: 'Área actualizada',
  maquina_creada: 'Máquina creada',
  maquina_actualizada: 'Máquina actualizada',
  maquina_foto: 'Foto de máquina',
  lubricante_creado: 'Lubricante creado',
  lubricante_actualizado: 'Lubricante actualizado',
}

export default function AuditPage() {
  const { user, isOnline } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [modulo, setModulo] = useState('')

  useEffect(() => {
    if (!user || !isOnline) return
    const params: Record<string, string> = {}
    if (modulo) params.modulo = modulo
    api.getAuditLogs(user.token, params).then(setLogs)
  }, [user, isOnline, modulo])

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Auditoría"
        subtitle="Trazabilidad de acciones en el sistema"
      />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['', 'lubrication', 'validacion', 'sync', 'auth', 'admin'].map((m) => (
          <button
            key={m || 'all'}
            type="button"
            onClick={() => setModulo(m)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
              modulo === m ? 'bg-[#004A99] text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            {m === '' ? 'Todos' : m === 'lubrication' ? 'Registros' : m === 'validacion' ? 'Validación' : m === 'auth' ? 'Acceso' : m === 'admin' ? 'Admin' : 'Sync'}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <p className="app-empty">Sin eventos de auditoría registrados aún.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="app-card p-4 flex gap-3">
              <div className="w-2 rounded-full bg-[#004A99] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 text-sm">
                    {ACTION_LABELS[log.accion] || log.accion}
                  </p>
                  <span className="text-xs text-slate-400">
                    {new Date(log.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {log.user_nombre || 'Sistema'} · {log.modulo}
                </p>
                {log.detalle && (
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1.5">
                    {log.detalle}
                  </p>
                )}
                {log.registro_id && log.registro_id > 0 && (
                  <Link
                    to={`/registros/${log.registro_id}`}
                    className="text-xs text-[#004A99] font-medium mt-1 inline-block"
                  >
                    Ver registro #{log.registro_id} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
