import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user || (user.rol !== 'admin' && user.rol !== 'ito')) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
