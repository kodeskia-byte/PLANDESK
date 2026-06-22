import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { countPending } from '../lib/db'
import { syncPendingRecords } from '../lib/sync'

export default function ConnectionBanner() {
  const { user, isOnline } = useAuth()
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    countPending().then(setPending)
  }, [isOnline])

  const handleSync = async () => {
    if (!user || !isOnline) return
    setSyncing(true)
    const count = await syncPendingRecords(user)
    setPending(await countPending())
    setSyncing(false)
    if (count > 0) alert(`${count} registro(s) sincronizado(s)`)
  }

  if (pending === 0 && isOnline) return null

  return (
    <div
      className={`app-card p-3 mb-4 flex items-center justify-between gap-3 ${
        isOnline ? 'border-[#F39200]/40 bg-[#F39200]/5' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isOnline ? 'bg-[#F39200]/15' : 'bg-red-100'}`}>
          <svg className={`w-4 h-4 ${isOnline ? 'text-[#F39200]' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <div>
          {!isOnline && (
            <p className="text-sm font-semibold text-red-600">Modo offline activo</p>
          )}
          {pending > 0 && (
            <p className={`text-sm ${isOnline ? 'text-[#c67600]' : 'text-red-500'}`}>
              {pending} registro(s) pendiente(s) de sincronización
            </p>
          )}
        </div>
      </div>
      {isOnline && pending > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="app-btn-accent text-sm px-4 py-2 disabled:opacity-50 shrink-0"
        >
          {syncing ? '...' : 'Sincronizar'}
        </button>
      )}
    </div>
  )
}
