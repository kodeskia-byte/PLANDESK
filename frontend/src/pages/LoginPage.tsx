import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin } from '../lib/api'
import type { UserRole } from '../types'
const ROLES: {
  id: UserRole
  label: string
  description: string
  icon: ReactNode
}[] = [
  {
    id: 'mecanico',
    label: 'Mecánico Lubricador',
    description: 'Registro en terreno',
    icon: <IconMechanic />,
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    description: 'Validación de registros',
    icon: <IconSupervisor />,
  },
  {
    id: 'ito',
    label: 'ITO Encargado del Área',
    description: 'Reportes y análisis',
    icon: <IconITO />,
  },
]

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<'operador' | 'admin'>('operador')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [rut, setRut] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isOnline } = useAuth()
  const navigate = useNavigate()
  const isAdminMode = loginMode === 'admin'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isAdminMode && !selectedRole) {
      setError('Selecciona tu perfil para continuar')
      return
    }

    if (!rut.trim() || !pin.trim()) {
      setError('Ingresa tu RUT y PIN de acceso')
      return
    }

    setLoading(true)
    try {
      const user = await apiLogin(rut, pin)

      if (isAdminMode) {
        if (user.rol !== 'admin') {
          setError('Esta cuenta no tiene perfil de administrador')
          setLoading(false)
          return
        }
      } else if (user.rol !== selectedRole) {
        setError('El perfil seleccionado no coincide con tu cuenta')
        setLoading(false)
        return
      }

      login(user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const selectRole = (role: UserRole) => {
    setSelectedRole(role)
    setError('')
  }

  const switchMode = (mode: 'operador' | 'admin') => {
    setLoginMode(mode)
    setSelectedRole(null)
    setError('')
  }

  return (
    <div className="login-screen min-h-screen relative flex flex-col">
      <div className="login-bg absolute inset-0" aria-hidden />
      <div className="login-overlay absolute inset-0" aria-hidden />

      <div className="relative z-10 flex flex-col min-h-screen px-5 py-6 max-w-md mx-auto w-full overflow-y-auto">
        {/* Header / Branding */}
        <header className="text-center pt-6 pb-6">
          <img
            src="/login-brand.png"
            alt="PlantDesk — lubricación industrial"
            className="mx-auto w-[88%] max-w-[340px] h-auto min-h-[72px] sm:max-w-[380px] object-contain drop-shadow-sm"
          />
          <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            Control y trazabilidad de lubricación en tiempo real
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          {/* Modo de acceso */}
          <div className="flex bg-white/90 rounded-2xl p-1 shadow-md border border-slate-100">
            <button
              type="button"
              onClick={() => switchMode('operador')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                !isAdminMode ? 'bg-[#004A99] text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Operadores
            </button>
            <button
              type="button"
              onClick={() => switchMode('admin')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                isAdminMode ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Administrador
            </button>
          </div>

          {/* Selección de perfil — solo operadores */}
          {!isAdminMode && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                Selecciona tu perfil
              </p>

              {ROLES.map((role) => {
                const active = selectedRole === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role.id)}
                    className={`login-role-card w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 text-left ${
                      active
                        ? 'border-[#004A99] bg-white shadow-lg shadow-[#004A99]/15'
                        : 'border-transparent bg-white/90 shadow-md hover:shadow-lg hover:border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        active ? 'bg-[#004A99]/10 text-[#004A99]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {role.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${active ? 'text-[#004A99]' : 'text-slate-800'}`}>
                        {role.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{role.description}</p>
                    </div>
                    <ChevronRight className={active ? 'text-[#004A99]' : 'text-slate-300'} />
                  </button>
                )
              })}
            </div>
          )}


          {/* Credenciales — siempre visibles */}
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-slate-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
              Credenciales de acceso
            </p>
            <div>
              <label htmlFor="rut" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                RUT
              </label>
              <input
                id="rut"
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="22.222.222-2"
                autoComplete="username"
                className="login-input"
              />
            </div>
            <div>
              <label htmlFor="pin" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                PIN de acceso
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                className="login-input"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? 'Ingresando...' : 'Ingresar'}</span>
            {!loading && <ArrowRight />}
          </button>
        </form>

        {/* Footer offline */}
        <footer className="mt-auto pt-4 space-y-3">
          <div className="flex items-center gap-3 bg-slate-100/80 border border-slate-200 rounded-2xl px-4 py-3">
            <CloudIcon online={isOnline} />
            <p className="text-xs text-slate-500 leading-snug">
              {isOnline ? (
                <>
                  <span className="font-semibold text-[#4CAF50]">Conectado</span>
                  {' — '}Los datos se sincronizan automáticamente
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-600">Modo Offline</span>
                  {' — '}Los datos se sincronizarán cuando haya conexión
                </>
              )}
            </p>
          </div>
          <p className="text-center text-[10px] text-slate-400">By <a href="https://kodesk.cl" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800">kodesk.cl</a></p>
        </footer>
      </div>
    </div>
  )
}

function ChevronRight({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ArrowRight() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

function CloudIcon({ online }: { online: boolean }) {
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${online ? 'bg-[#4CAF50]/15' : 'bg-slate-200'}`}>
      <svg className={`w-5 h-5 ${online ? 'text-[#4CAF50]' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        {!online && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" strokeWidth={2} />
        )}
      </svg>
    </div>
  )
}

function IconMechanic() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a3 3 0 00-3 3v1H8a2 2 0 00-2 2v1h12v-1a2 2 0 00-2-2h-1V7a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 14h16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconSupervisor() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function IconITO() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}
