import { useEffect, useState } from 'react'
import ConnectionBanner from '../../components/ConnectionBanner'
import MediaImage from '../../components/MediaImage'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import type { Lubricant, LubricantInput } from '../../types'

const UNITS = ['ml', 'L', 'g', 'kg', 'oz']

const emptyForm: LubricantInput = { nombre: '', codigo: '', unidad_default: 'ml' }

export default function AdminLubricantsPage() {
  const { user, isOnline } = useAuth()
  const [lubricants, setLubricants] = useState<Lubricant[]>([])
  const [editing, setEditing] = useState<Lubricant | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<LubricantInput>(emptyForm)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = () => {
    if (!user || !isOnline) return
    api.getLubricants(user.token, { include_inactive: true }).then(setLubricants)
  }

  useEffect(load, [user, isOnline])

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const resetPhoto = () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    resetPhoto()
    setShowForm(true)
    setError('')
  }

  const openEdit = (l: Lubricant) => {
    setEditing(l)
    setForm({
      nombre: l.nombre,
      codigo: l.codigo,
      descripcion: l.descripcion,
      unidad_default: l.unidad_default,
      estado: l.estado,
    })
    resetPhoto()
    setPhotoPreview(l.foto_url || null)
    setShowForm(true)
    setError('')
  }

  const handlePhoto = (file: File | null) => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : editing?.foto_url || null)
  }

  const save = async () => {
    if (!user || !form.nombre.trim() || !form.codigo.trim()) {
      setError('Nombre y código son obligatorios')
      return
    }
    try {
      let lubricantId = editing?.id
      if (editing) {
        await api.updateLubricant(user.token, editing.id, form)
        setMessage('Lubricante actualizado')
      } else {
        const created = await api.createLubricant(user.token, form)
        lubricantId = created.id
        setMessage('Lubricante creado')
      }

      if (photoFile && lubricantId) {
        await api.uploadLubricantPhoto(user.token, lubricantId, photoFile)
        setMessage(editing ? 'Lubricante y foto actualizados' : 'Lubricante creado con foto')
      }

      setShowForm(false)
      resetPhoto()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const uploadPhoto = async (lubricantId: number, file: File) => {
    if (!user) return
    try {
      await api.uploadLubricantPhoto(user.token, lubricantId, file)
      setMessage('Foto actualizada')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir foto')
    }
  }

  const toggleStatus = async (l: Lubricant) => {
    if (!user) return
    const next = l.estado === 'activo' ? 'inactivo' : 'activo'
    if (!confirm(`${next === 'inactivo' ? 'Desactivar' : 'Activar'} ${l.nombre}?`)) return
    try {
      await api.updateLubricant(user.token, l.id, { estado: next })
      setMessage(`Lubricante ${next}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Lubricantes"
        subtitle="Catálogo de lubricantes, unidades y fotos"
        backTo="/admin"
        backLabel="Administración"
      />

      {message && <p className="text-sm text-[#2e7d32] bg-[#4CAF50]/10 rounded-xl px-4 py-2 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{error}</p>}

      <button type="button" onClick={openCreate} className="app-btn-primary mb-4">+ Nuevo lubricante</button>

      {showForm && (
        <div className="app-card p-5 mb-6 space-y-3">
          <p className="font-semibold">{editing ? 'Editar lubricante' : 'Nuevo lubricante'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="field-input" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <input
              className="field-input"
              placeholder="Código"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              disabled={!!editing}
            />
            <select
              className="field-input"
              value={form.unidad_default || 'ml'}
              onChange={(e) => setForm({ ...form, unidad_default: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <textarea
            className="field-input min-h-[60px]"
            placeholder="Descripción"
            value={form.descripcion || ''}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Foto del lubricante <span className="text-slate-400 font-normal normal-case">(opcional)</span>
            </p>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 max-w-xs">
                <MediaImage src={photoPreview} alt="Vista previa lubricante" className="w-full h-36" />
                <button
                  type="button"
                  onClick={() => handlePhoto(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:border-[#004A99]/40 hover:bg-[#004A99]/5 transition cursor-pointer block max-w-xs">
                <p className="text-sm font-semibold text-slate-700">Subir foto del lubricante</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG — identificación visual del producto</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhoto(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={save} className="app-btn-primary text-sm">Guardar</button>
            <button type="button" onClick={() => { setShowForm(false); resetPhoto() }} className="app-btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {lubricants.map((l) => (
          <div key={l.id} className="app-card p-4 flex gap-4 items-center">
            <MediaImage src={l.foto_url} alt={l.nombre} className="w-16 h-16 rounded-xl shrink-0" fallback="🛢️" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{l.nombre}</p>
              <p className="text-sm text-slate-500">Código: {l.codigo} · Unidad: {l.unidad_default}</p>
              <p className="text-xs text-slate-400 mt-1">
                <span className={l.estado === 'activo' ? 'text-[#2e7d32]' : 'text-red-500'}>{l.estado}</span>
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button type="button" onClick={() => openEdit(l)} className="text-xs text-[#004A99] font-medium">Editar</button>
                <button type="button" onClick={() => toggleStatus(l)} className="text-xs text-slate-500 font-medium">
                  {l.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <label className="text-xs text-[#F39200] font-medium cursor-pointer">
                  Subir foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadPhoto(l.id, file)
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
