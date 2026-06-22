import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleLabels: Record<string, string> = {
  mecanico: 'Mecánico Lubricador',
  supervisor: 'Supervisor',
  ito: 'ITO Encargado',
  admin: 'Administrador',
}

const roleColors: Record<string, string> = {
  mecanico: 'bg-[#F39200]',
  supervisor: 'bg-[#004A99]',
  ito: 'bg-[#4CAF50]',
  admin: 'bg-slate-600',
}

type NavEntry = {
  to: string
  label: string
  icon: () => ReactNode
  end?: boolean
  accent?: boolean
}

export default function Layout() {
  const { user, logout, isOnline } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isMecanico = user?.rol === 'mecanico' || user?.rol === 'admin'
  const isSupervisorPlus = user?.rol === 'supervisor' || user?.rol === 'ito' || user?.rol === 'admin'
  const isAdminPlus = user?.rol === 'ito' || user?.rol === 'admin'

  const sideNav = useMemo((): NavEntry[] => {
    const items: NavEntry[] = [
      { to: '/', label: 'Inicio', icon: IconHome, end: true },
      { to: '/areas', label: 'Áreas', icon: IconAreas },
      { to: '/historial', label: 'Historial', icon: IconHistory },
    ]
    if (isMecanico) {
      items.push({ to: '/registro', label: 'Nueva lubricación', icon: IconPlus, accent: true })
    }
    if (isSupervisorPlus) {
      items.push(
        { to: '/validacion', label: 'Validación', icon: IconCheck },
        { to: '/reportes', label: 'Reportes', icon: IconReport },
        { to: '/kpis', label: 'KPIs', icon: IconChart },
      )
    }
    if (isAdminPlus) {
      items.push(
        { to: '/auditoria', label: 'Auditoría', icon: IconAudit },
        { to: '/admin', label: 'Administración', icon: IconAdmin },
      )
    }
    return items
  }, [isMecanico, isSupervisorPlus, isAdminPlus])

  const bottomNav = useMemo((): NavEntry[] => {
    const items: NavEntry[] = [
      { to: '/', label: 'Inicio', icon: IconHome, end: true },
      { to: '/historial', label: 'Historial', icon: IconHistory },
    ]
    if (isMecanico) items.push({ to: '/registro', label: 'Registrar', icon: IconPlus, accent: true })
    if (user?.rol === 'supervisor' || user?.rol === 'admin') {
      items.push({ to: '/validacion', label: 'Validar', icon: IconCheck })
    }
    items.push({ to: '#menu', label: 'Menú', icon: IconMenu })
    return items
  }, [isMecanico, user?.rol])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9]">
      {/* Header */}
      <header className="bg-[#004A99] text-white px-3 sm:px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition shrink-0"
            aria-label="Abrir menú"
          >
            <IconMenu />
          </button>
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur shrink-0">
              <span className="font-bold text-sm">PDK</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">
                Plant<span className="text-[#F39200]">DESK</span>
              </p>
              <p className="text-[10px] text-white/70 truncate hidden xs:block sm:block">
                {user ? roleLabels[user.rol] : ''}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
              isOnline ? 'bg-[#4CAF50]/30 text-white' : 'bg-red-500/30 text-white'
            }`}
          >
            {isOnline ? '● Online' : '● Offline'}
          </span>
          <button
            onClick={handleLogout}
            className="hidden sm:block text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Drawer móvil */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute top-0 left-0 h-full w-[min(300px,85vw)] bg-white shadow-2xl flex flex-col animate-slide-in-left">
            {/* Cabecera drawer */}
            <div className="bg-[#004A99] text-white px-4 py-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-base">
                  SHEKINA <span className="text-[#F39200]">LUB</span>
                </p>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition"
                  aria-label="Cerrar"
                >
                  <IconClose />
                </button>
              </div>
              {user && (
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${roleColors[user.rol]}`}
                  >
                    {user.nombre[0]}
                    {user.apellido[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {user.nombre} {user.apellido}
                    </p>
                    <p className="text-xs text-white/70">{roleLabels[user.rol]}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Enlaces */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {sideNav.map((item) => (
                <SideNavLink
                  key={item.to}
                  item={item}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
            </nav>

            {/* Pie drawer */}
            <div className="border-t border-slate-200 p-4 space-y-2">
              <div
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
                  isOnline ? 'bg-[#4CAF50]/10 text-[#2e7d32]' : 'bg-red-50 text-red-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#4CAF50]' : 'bg-red-500'}`} />
                {isOnline ? 'Conectado' : 'Modo offline'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
              >
                <IconLogout />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Bienvenida en inicio */}
      {user && location.pathname === '/' && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${roleColors[user.rol]}`}
          >
            {user.nombre[0]}
            {user.apellido[0]}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">
              {user.nombre} {user.apellido}
            </p>
            <p className="text-xs text-slate-500">{roleLabels[user.rol]}</p>
          </div>
        </div>
      )}

      {/* Nav desktop */}
      <nav className="hidden sm:flex bg-white border-b border-slate-200 px-4 py-2 gap-1 overflow-x-auto shadow-sm">
        {sideNav.map((item) => (
          <NavItem key={item.to} to={item.to} end={item.end}>
            {item.label}
          </NavItem>
        ))}
      </nav>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full pb-24 sm:pb-6">
        <Outlet />
      </main>

      {/* Bottom nav móvil */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex justify-around items-center py-2 px-1">
          {bottomNav.map((item) =>
            item.to === '#menu' ? (
              <button
                key="menu"
                type="button"
                onClick={() => setMenuOpen(true)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] transition ${
                  menuOpen ? 'text-[#004A99]' : 'text-slate-400'
                }`}
              >
                <item.icon />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] transition ${
                    isActive
                      ? item.accent
                        ? 'text-[#F39200]'
                        : 'text-[#004A99]'
                      : 'text-slate-400'
                  }`
                }
              >
                <item.icon />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  )
}

function SideNavLink({ item, onNavigate }: { item: NavEntry; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-3 rounded-xl mb-0.5 font-medium text-sm transition ${
          isActive
            ? item.accent
              ? 'bg-[#F39200]/10 text-[#c67600]'
              : 'bg-[#004A99]/10 text-[#004A99]'
            : 'text-slate-600 hover:bg-slate-50'
        }`
      }
    >
      <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5">
        <item.icon />
      </span>
      {item.label}
    </NavLink>
  )
}

function NavItem({ to, children, end }: { to: string; children: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `text-sm px-3 py-1.5 rounded-lg transition whitespace-nowrap font-medium ${
          isActive
            ? 'bg-[#004A99] text-white'
            : 'text-slate-500 hover:text-[#004A99] hover:bg-[#004A99]/5'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function IconMenu() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function IconHome() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function IconAreas() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconReport() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

function IconCheck() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IconAudit() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function IconAdmin() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
