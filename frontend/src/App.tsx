import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AreasPage from './pages/AreasPage'
import AreaDetailPage from './pages/AreaDetailPage'
import MachineDetailPage from './pages/MachineDetailPage'
import RegisterPage from './pages/RegisterPage'
import HistoryPage from './pages/HistoryPage'
import ValidationPage from './pages/ValidationPage'
import ReportsPage from './pages/ReportsPage'
import KPIsPage from './pages/KPIsPage'
import AuditPage from './pages/AuditPage'
import RecordDetailPage from './pages/RecordDetailPage'
import AdminRoute from './components/AdminRoute'
import AdminPage from './pages/admin/AdminPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminAreasPage from './pages/admin/AdminAreasPage'
import AdminMachinesPage from './pages/admin/AdminMachinesPage'
import AdminLubricantsPage from './pages/admin/AdminLubricantsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="areas/:areaId" element={<AreaDetailPage />} />
        <Route path="maquinas/:machineId" element={<MachineDetailPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="historial" element={<HistoryPage />} />
        <Route path="registros/:recordId" element={<RecordDetailPage />} />
        <Route path="validacion" element={<ValidationPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="kpis" element={<KPIsPage />} />
        <Route path="auditoria" element={<AuditPage />} />
        <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="admin/usuarios" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="admin/areas" element={<AdminRoute><AdminAreasPage /></AdminRoute>} />
        <Route path="admin/maquinas" element={<AdminRoute><AdminMachinesPage /></AdminRoute>} />
        <Route path="admin/lubricantes" element={<AdminRoute><AdminLubricantsPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
