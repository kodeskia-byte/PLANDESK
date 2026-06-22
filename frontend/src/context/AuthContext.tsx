import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser } from '../types'
import { syncPendingRecords } from '../lib/sync'

interface AuthContextType {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isOnline: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'shekina_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (user && isOnline) {
      syncPendingRecords(user)
    }
  }, [user, isOnline])

  const login = (authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isOnline }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
