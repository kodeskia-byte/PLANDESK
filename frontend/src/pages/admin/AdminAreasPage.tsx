import { useEffect, useState, type ReactNode } from 'react'
import { AreaCardPreview } from '../../components/AreaCard'
import ConnectionBanner from '../../components/ConnectionBanner'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { getAreaColor } from '../../lib/areaColors'
import { AreaIcon, getAreaIconLabel, getAreaIconType } from '../../lib/areaIcons'
import type { Area, AreaInput } from '../../types'

const emptyForm: AreaInput = { nombre: '', descripcion: '' }

const EXAMPLES = [
  { nombre: 'Área Línea 1', descripcion: 'Línea de producción principal' },
  { nombre: 'Área Secado', descripcion: 'Proceso de secado de madera' },
  { nombre: 'Área Caldera', descripcion: 'Sistema de calderas industriales' },
]

export default function AdminAreasPage() {
  const { user, isOnline } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [editing, setEditing] = useState<Area | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AreaInput>(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = () => {
    if (!user || !isOnline) return
    api.getAreas(user.token, { include_inactive: true }).then(setAreas)
  }

  useEffect(load, [user, isOnline])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  const openEdit = (a: Area) => {
    setEditing(a)
    setForm({ nombre: a.nombre, descripcion: a.descripcion || '', estado: a.estado })
    setShowForm(true)
    setError('')
  }

  const applyExample = (ex: (typeof EXAMPLES)[0]) => {
    setForm({ nombre: ex.nombre, descripcion: ex.descripcion })
    setError('')
  }

  const save = async () => {
    if (!user || !form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    try {
      if (editing) {
        await api.updateArea(user.token, editing.id, form)
        setMessage('Área actualizada')
      } else {
        await api.createArea(user.token, form)
        setMessage('Área creada')
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const toggleStatus = async (a: Area) => {
    if (!user) return
    const next = a.estado === 'activa' ? 'inactiva' : 'activa'
    if (!confirm(`${next === 'inactiva' ? 'Desactivar' : 'Activar'} área ${a.nombre}?`)) return
    try {
      await api.updateArea(user.token, a.id, { estado: next })
      setMessage(`Área ${next}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  const previewIndex = editing ? areas.findIndex((a) => a.id === editing.id) : areas.length

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Áreas"
        subtitle="Crear y editar sectores de trabajo para los mecánicos"
        backTo="/admin"
        backLabel="Administración"
      />

      {message && (
        <p className="text-sm text-[#2e7d32] bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
          <IconCheck />
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">{error}</p>
      )}

      <button type="button" onClick={openCreate} className="app-btn-primary mb-4 inline-flex items-center gap-2">
        <IconPlus />
        Nueva área
      </button>

      {showForm && (
        <div className="app-card p-5 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#004A99]/10 text-[#004A99] flex items-center justify-center">
              <IconMap />
            </div>
            <div>
              <p className="font-bold text-slate-800">{editing ? 'Editar área' : 'Crear nueva área'}</p>
              <p className="text-xs text-slate-500">
                Define el sector donde operan las máquinas. El mecánico la verá como tarjeta con icono.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <Field
                label="Nombre del área"
                hint="Usa un nombre claro: Línea, Secado, Caldera, Mantenimiento..."
                required
              >
                <input
                  className="field-input"
                  placeholder="Ej: Área Línea 1"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </Field>

              <Field
                label="Descripción"
                hint="Breve texto que ayude al mecánico a identificar el sector"
              >
                <textarea
                  className="field-input min-h-[90px]"
                  placeholder="Ej: Línea de producción principal, sector norte..."
                  value={form.descripcion || ''}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </Field>

              {!editing && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Ejemplos rápidos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex.nombre}
                        type="button"
                        onClick={() => applyExample(ex)}
                        className="text-xs bg-slate-100 hover:bg-[#004A99]/10 hover:text-[#004A99] text-slate-600 px-3 py-1.5 rounded-full font-medium transition"
                      >
                        {ex.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.nombre.trim() && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <IconInfo />
                  Icono detectado: <strong>{getAreaIconLabel(getAreaIconType(form.nombre, previewIndex))}</strong>
                  {' '}(según palabras en el nombre)
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={save} className="app-btn-primary text-sm inline-flex items-center gap-1.5">
                  <IconCheck />
                  {editing ? 'Guardar cambios' : 'Crear área'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="app-btn-ghost">
                  Cancelar
                </button>
              </div>
            </div>

            <AreaCardPreview
              nombre={form.nombre}
              descripcion={form.descripcion || ''}
              index={previewIndex >= 0 ? previewIndex : 0}
            />
          </div>
        </div>
      )}

      <p className="app-section-title mb-3">{areas.length} área(s) registrada(s)</p>
      <div className="space-y-2">
        {areas.map((a, i) => (
          <div key={a.id} className="app-card p-4 flex gap-4 items-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getAreaColor(i)}`}>
              <AreaIcon nombre={a.nombre} index={i} size="sm" bare />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{a.nombre}</p>
              <p className="text-sm text-slate-500 truncate">{a.descripcion || 'Sin descripción'}</p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <IconMachine />
                  {a.machine_count} máquinas
                </span>
                <span className={a.estado === 'activa' ? 'text-[#2e7d32]' : 'text-red-500'}>
                  {a.estado === 'activa' ? '● Activa' : '● Inactiva'}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => openEdit(a)} className="text-xs text-[#004A99] font-medium">
                Editar
              </button>
              <button type="button" onClick={() => toggleStatus(a)} className="text-xs text-slate-500 font-medium">
                {a.estado === 'activa' ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

function IconPlus() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconMachine() {
  return (
    <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
