import { useEffect, useState } from 'react'
import ConnectionBanner from '../../components/ConnectionBanner'
import MediaImage from '../../components/MediaImage'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import type { Area, Lubricant, Machine, MachineInput } from '../../types'

const emptyForm: MachineInput = {
  area_id: 0,
  nombre: '',
  tag: '',
  frecuencia_dias: 30,
  estado: 'activa',
}

export default function AdminMachinesPage() {
  const { user, isOnline } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [lubricants, setLubricants] = useState<Lubricant[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [filterArea, setFilterArea] = useState('')
  const [editing, setEditing] = useState<Machine | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<MachineInput>(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = () => {
    if (!user || !isOnline) return
    api.getAreas(user.token, { include_inactive: true }).then(setAreas)
    api.getLubricants(user.token, { include_inactive: true }).then(setLubricants)
    const params: { areaId?: number; include_inactive: boolean } = { include_inactive: true }
    if (filterArea) params.areaId = Number(filterArea)
    api.getMachines(user.token, params).then(setMachines)
  }

  useEffect(load, [user, isOnline, filterArea])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, area_id: filterArea ? Number(filterArea) : areas[0]?.id || 0 })
    setShowForm(true)
    setError('')
  }

  const openEdit = (m: Machine) => {
    setEditing(m)
    setForm({
      area_id: m.area_id,
      nombre: m.nombre,
      tag: m.tag,
      codigo_interno: m.codigo_interno,
      descripcion: m.descripcion,
      tipo_maquina: m.tipo_maquina,
      lubricante_recomendado_id: m.lubricante_recomendado_id,
      frecuencia_dias: m.frecuencia_dias,
      estado: m.estado,
    })
    setShowForm(true)
    setError('')
  }

  const save = async () => {
    if (!user || !form.nombre.trim() || !form.tag.trim() || !form.area_id) {
      setError('Nombre, TAG y área son obligatorios')
      return
    }
    try {
      if (editing) {
        await api.updateMachine(user.token, editing.id, form)
        setMessage('Máquina actualizada')
      } else {
        await api.createMachine(user.token, form)
        setMessage('Máquina creada')
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const uploadPhoto = async (machineId: number, file: File) => {
    if (!user) return
    try {
      await api.uploadMachinePhoto(user.token, machineId, file)
      setMessage('Foto actualizada')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir foto')
    }
  }

  const toggleStatus = async (m: Machine) => {
    if (!user) return
    const next = m.estado === 'activa' ? 'inactiva' : 'activa'
    if (!confirm(`${next === 'inactiva' ? 'Desactivar' : 'Activar'} ${m.nombre}?`)) return
    try {
      await api.updateMachine(user.token, m.id, { estado: next })
      setMessage(`Máquina ${next}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Máquinas"
        subtitle="Alta, edición y fotos de equipos"
        backTo="/admin"
        backLabel="Administración"
      />

      {message && <p className="text-sm text-[#2e7d32] bg-[#4CAF50]/10 rounded-xl px-4 py-2 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{error}</p>}

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="field-input max-w-xs">
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <button type="button" onClick={openCreate} className="app-btn-primary">+ Nueva máquina</button>
      </div>

      {showForm && (
        <div className="app-card p-5 mb-6 space-y-3">
          <p className="font-semibold">{editing ? 'Editar máquina' : 'Nueva máquina'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              className="field-input"
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: Number(e.target.value) })}
            >
              <option value={0}>Seleccionar área</option>
              {areas.filter((a) => a.estado === 'activa').map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
            <input className="field-input" placeholder="TAG" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
            <input className="field-input" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <input className="field-input" placeholder="Código interno" value={form.codigo_interno || ''} onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })} />
            <input className="field-input" placeholder="Tipo máquina" value={form.tipo_maquina || ''} onChange={(e) => setForm({ ...form, tipo_maquina: e.target.value })} />
            <input
              className="field-input"
              type="number"
              placeholder="Frecuencia (días)"
              value={form.frecuencia_dias || ''}
              onChange={(e) => setForm({ ...form, frecuencia_dias: Number(e.target.value) || null })}
            />
            <select
              className="field-input"
              value={form.lubricante_recomendado_id || ''}
              onChange={(e) => setForm({ ...form, lubricante_recomendado_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Sin lubricante asignado</option>
              {lubricants.filter((l) => l.estado === 'activo').map((l) => (
                <option key={l.id} value={l.id}>{l.nombre} ({l.codigo})</option>
              ))}
            </select>
            <select className="field-input" value={form.estado || 'activa'} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
              <option value="en_mantencion">En mantención</option>
            </select>
          </div>
          <textarea
            className="field-input min-h-[60px]"
            placeholder="Descripción"
            value={form.descripcion || ''}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="app-btn-primary text-sm">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="app-btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {machines.map((m) => (
          <div key={m.id} className="app-card p-4 flex gap-4">
            <MediaImage src={m.foto_url} alt={m.nombre} className="w-16 h-16 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{m.nombre}</p>
              <p className="text-sm text-slate-500">TAG: {m.tag} · {m.area_nombre}</p>
              <p className="text-xs text-slate-400">
                Frecuencia: {m.frecuencia_dias || '—'} días · {m.estado}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button type="button" onClick={() => openEdit(m)} className="text-xs text-[#004A99] font-medium">Editar</button>
                <button type="button" onClick={() => toggleStatus(m)} className="text-xs text-slate-500 font-medium">
                  {m.estado === 'activa' ? 'Desactivar' : 'Activar'}
                </button>
                <label className="text-xs text-[#F39200] font-medium cursor-pointer">
                  Subir foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadPhoto(m.id, file)
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
