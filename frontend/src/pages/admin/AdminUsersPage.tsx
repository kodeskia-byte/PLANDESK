import { useEffect, useState } from 'react'
import ConnectionBanner from '../../components/ConnectionBanner'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import type { AdminUser, Area, UserCreateInput, UserRole } from '../../types'

const ROLES: UserRole[] = ['mecanico', 'supervisor', 'ito', 'admin']
const ROLE_LABELS: Record<UserRole, string> = {
  mecanico: 'Mecánico',
  supervisor: 'Supervisor',
  ito: 'ITO',
  admin: 'Admin',
}

const emptyForm: UserCreateInput = {
  rut: '',
  nombre: '',
  apellido: '',
  pin: '',
  rol: 'mecanico',
  area_ids: [],
}

export default function AdminUsersPage() {
  const { user, isOnline } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UserCreateInput>(emptyForm)
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = () => {
    if (!user || !isOnline) return
    api.getUsers(user.token).then(setUsers)
    api.getAreas(user.token, { include_inactive: true }).then(setAreas)
  }

  useEffect(load, [user, isOnline])

  const toggleArea = (areaId: number) => {
    setForm((f) => ({
      ...f,
      area_ids: f.area_ids.includes(areaId)
        ? f.area_ids.filter((id) => id !== areaId)
        : [...f.area_ids, areaId],
    }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  const openEdit = (u: AdminUser) => {
    setEditing(u)
    setForm({
      rut: u.rut,
      nombre: u.nombre,
      apellido: u.apellido,
      pin: '',
      rol: u.rol,
      area_ids: u.area_ids,
    })
    setShowForm(true)
    setError('')
  }

  const save = async () => {
    if (!user) return
    setError('')
    try {
      if (editing) {
        await api.updateUser(user.token, editing.id, {
          nombre: form.nombre,
          apellido: form.apellido,
          rol: form.rol,
          area_ids: form.area_ids,
        })
        setMessage('Usuario actualizado')
      } else {
        if (!form.rut || !form.pin) {
          setError('RUT y PIN son obligatorios')
          return
        }
        await api.createUser(user.token, form)
        setMessage('Usuario creado')
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const toggleStatus = async (u: AdminUser) => {
    if (!user) return
    const next = u.estado === 'activo' ? 'inactivo' : 'activo'
    if (!confirm(`${next === 'inactivo' ? 'Desactivar' : 'Activar'} a ${u.nombre}?`)) return
    try {
      await api.updateUser(user.token, u.id, { estado: next })
      setMessage(`Usuario ${next}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  const resetPin = async (u: AdminUser) => {
    if (!user || !newPin || newPin.length < 4) {
      setError('Ingresa un PIN de al menos 4 caracteres')
      return
    }
    if (!confirm(`¿Reiniciar PIN de ${u.nombre}?`)) return
    try {
      await api.resetUserPin(user.token, u.id, newPin)
      setNewPin('')
      setMessage('PIN reiniciado correctamente')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reiniciar PIN')
    }
  }

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de cuentas y permisos"
        backTo="/admin"
        backLabel="Administración"
      />

      {message && (
        <p className="text-sm text-[#2e7d32] bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded-xl px-4 py-2 mb-4">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">
          {error}
        </p>
      )}

      <button type="button" onClick={openCreate} className="app-btn-primary mb-4">
        + Nuevo usuario
      </button>

      {showForm && (
        <div className="app-card p-5 mb-6 space-y-3">
          <p className="font-semibold text-slate-800">{editing ? 'Editar usuario' : 'Nuevo usuario'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="field-input"
              placeholder="RUT"
              value={form.rut}
              onChange={(e) => setForm({ ...form, rut: e.target.value })}
              disabled={!!editing}
            />
            <select
              className="field-input"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <input
              className="field-input"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              className="field-input"
              placeholder="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
            {!editing && (
              <input
                className="field-input"
                placeholder="PIN inicial"
                type="password"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
              />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Áreas asignadas</p>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleArea(a.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    form.area_ids.includes(a.id)
                      ? 'bg-[#004A99] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} className="app-btn-primary text-sm">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="app-btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="app-card p-4">
            <div className="flex justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-slate-800">{u.nombre} {u.apellido}</p>
                <p className="text-sm text-slate-500">{u.rut} · {ROLE_LABELS[u.rol]}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {u.area_ids.length} área(s) ·{' '}
                  <span className={u.estado === 'activo' ? 'text-[#2e7d32]' : 'text-red-500'}>
                    {u.estado}
                  </span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => openEdit(u)} className="text-xs text-[#004A99] font-medium">
                  Editar
                </button>
                <button type="button" onClick={() => toggleStatus(u)} className="text-xs text-slate-500 font-medium">
                  {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-3 items-center">
              <input
                className="field-input text-sm flex-1"
                type="password"
                placeholder="Nuevo PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <button type="button" onClick={() => resetPin(u)} className="app-btn-outline text-sm whitespace-nowrap">
                Reiniciar PIN
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
