import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import ComplianceBadge from '../components/ComplianceBadge'
import ConnectionBanner from '../components/ConnectionBanner'
import MediaImage from '../components/MediaImage'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { saveAllPendingEvidence, savePendingRecord } from '../lib/db'
import {
  cacheAreas,
  cacheCorrectionRecord,
  cacheLubricants,
  cacheMachines,
  getCachedAreas,
  getCachedCorrectionRecord,
  getCachedLubricants,
  getCachedMachines,
} from '../lib/offlineCache'
import { AreaIcon } from '../lib/areaIcons'
import type { EvidencePhase } from '../components/EvidenceViewer'
import type { Area, Lubricant, LubricationRecord, Machine } from '../types'

const EVIDENCE_PHASES: { key: EvidencePhase; label: string; hint: string }[] = [
  { key: 'antes', label: 'Antes', hint: 'Estado previo al lubricado' },
  { key: 'durante', label: 'Durante', hint: 'Aplicación del lubricante' },
  { key: 'despues', label: 'Después', hint: 'Resultado final del trabajo' },
]

const emptyEvidenceFiles = (): Record<EvidencePhase, File | null> => ({
  antes: null,
  durante: null,
  despues: null,
})

const emptyEvidencePreviews = (): Record<EvidencePhase, string | null> => ({
  antes: null,
  durante: null,
  despues: null,
})

interface FormData {
  area_id: number
  machine_id: number
  ot: string
  lubricant_id: number
  cantidad: number
  unidad: string
  observaciones: string
}

export default function RegisterPage() {
  const { user, isOnline } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [areas, setAreas] = useState<Area[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [lubricants, setLubricants] = useState<Lubricant[]>([])
  const [evidenceFiles, setEvidenceFiles] = useState(emptyEvidenceFiles)
  const [evidencePreviews, setEvidencePreviews] = useState(emptyEvidencePreviews)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const correctionId = Number(params.get('correction')) || 0
  const isCorrection = correctionId > 0
  const [correctionRecord, setCorrectionRecord] = useState<LubricationRecord | null>(null)
  const [loadingCorrection, setLoadingCorrection] = useState(isCorrection)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      unidad: 'ml',
      cantidad: 0,
      area_id: Number(params.get('area')) || 0,
      machine_id: Number(params.get('machine')) || 0,
    },
  })

  const selectedArea = watch('area_id')
  const selectedMachineId = watch('machine_id')
  const selectedLubricantId = watch('lubricant_id')
  const otValue = watch('ot')
  const cantidad = watch('cantidad')

  const selectedAreaData = areas.find((a) => a.id === selectedArea)
  const selectedMachine = machines.find((m) => m.id === selectedMachineId)
  const selectedLubricant = lubricants.find((l) => l.id === selectedLubricantId)
  const areaIndex = areas.findIndex((a) => a.id === selectedArea)

  const allEvidenceReady = EVIDENCE_PHASES.every((p) => evidenceFiles[p.key])

  const progress = useMemo(() => {
    let step = 0
    if (selectedArea && selectedMachineId) step = 1
    if (step === 1 && otValue && selectedLubricantId && cantidad > 0) step = 2
    if (step === 2 && allEvidenceReady) step = 3
    return step
  }, [selectedArea, selectedMachineId, otValue, selectedLubricantId, cantidad, allEvidenceReady])

  useEffect(() => {
    if (!user) return
    if (isOnline) {
      api.getAreas(user.token).then((data) => {
        setAreas(data)
        cacheAreas(data)
      })
      api.getLubricants(user.token).then((data) => {
        setLubricants(data)
        cacheLubricants(data)
      })
    } else {
      setAreas(getCachedAreas())
      setLubricants(getCachedLubricants())
    }
  }, [user, isOnline])

  const applyCorrectionRecord = (record: LubricationRecord) => {
    setCorrectionRecord(record)
    setValue('area_id', record.area_id)
    setValue('machine_id', record.machine_id)
    setValue('ot', record.ot)
    setValue('lubricant_id', record.lubricant_id)
    setValue('cantidad', record.cantidad)
    setValue('unidad', record.unidad)
    setValue('observaciones', record.observaciones || '')
  }

  useEffect(() => {
    if (!user || !correctionId) return

    const loadCached = () => {
      const cached = getCachedCorrectionRecord(correctionId)
      if (!cached) {
        setErrorMsg('Sin conexión: abre la corrección con internet al menos una vez.')
        setLoadingCorrection(false)
        return
      }
      if (cached.estado_validacion !== 'correccion_solicitada') {
        setErrorMsg('Este registro ya no está pendiente de corrección.')
        setLoadingCorrection(false)
        return
      }
      applyCorrectionRecord(cached)
      setLoadingCorrection(false)
    }

    if (!isOnline) {
      loadCached()
      return
    }

    setLoadingCorrection(true)
    api
      .getRecord(user.token, correctionId)
      .then((record) => {
        if (record.estado_validacion !== 'correccion_solicitada') {
          setErrorMsg('Este registro no está pendiente de corrección.')
          return
        }
        cacheCorrectionRecord(record)
        applyCorrectionRecord(record)
      })
      .catch(() => setErrorMsg('No se pudo cargar el registro a corregir.'))
      .finally(() => setLoadingCorrection(false))
  }, [user, correctionId, isOnline, setValue])

  useEffect(() => {
    if (!user || !selectedArea) {
      setMachines([])
      return
    }
    if (isOnline) {
      api.getMachines(user.token, { areaId: selectedArea }).then((data) => {
        setMachines(data)
        cacheMachines(selectedArea, data)
      })
    } else {
      setMachines(getCachedMachines(selectedArea))
    }
  }, [user, selectedArea, isOnline])

  useEffect(() => {
    if (!selectedMachine?.lubricante_recomendado_id) return
    setValue('lubricant_id', selectedMachine.lubricante_recomendado_id)
  }, [selectedMachine, setValue])

  useEffect(() => {
    if (!selectedLubricant) return
    setValue('unidad', selectedLubricant.unidad_default)
  }, [selectedLubricant, setValue])

  useEffect(() => {
    return () => {
      EVIDENCE_PHASES.forEach((p) => {
        const preview = evidencePreviews[p.key]
        if (preview) URL.revokeObjectURL(preview)
      })
    }
  }, [evidencePreviews])

  const handleEvidence = (phase: EvidencePhase, file: File | null) => {
    const prev = evidencePreviews[phase]
    if (prev) URL.revokeObjectURL(prev)
    setEvidenceFiles((current) => ({ ...current, [phase]: file }))
    setEvidencePreviews((current) => ({
      ...current,
      [phase]: file ? URL.createObjectURL(file) : null,
    }))
  }

  const suggestOt = () => {
    const tag = selectedMachine?.tag?.replace(/\s/g, '') || 'GEN'
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    setValue('ot', `LUB-${date}-${tag}`)
  }

  const persistOffline = async (
    uuid: string,
    data: FormData,
    now: Date,
    correctionOfId?: number,
  ) => {
    await savePendingRecord({
      uuid_local: uuid,
      area_id: data.area_id,
      machine_id: data.machine_id,
      ot: data.ot,
      lubricant_id: data.lubricant_id,
      cantidad: data.cantidad,
      unidad: data.unidad,
      fecha_registro: now.toISOString().split('T')[0],
      hora_registro: now.toTimeString().slice(0, 8),
      observaciones: data.observaciones || null,
      evidencia_url: null,
      evidencia_antes_url: null,
      evidencia_durante_url: null,
      evidencia_despues_url: null,
      estado_sincronizacion: 'local',
      created_at_local: now.toISOString(),
      correction_of_id: correctionOfId,
    })
    await saveAllPendingEvidence(uuid, evidenceFiles)
  }

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setSaving(true)
    setMessage('')
    setErrorMsg('')

    if (!allEvidenceReady) {
      setErrorMsg('Debes adjuntar las 3 fotos de evidencia: Antes, Durante y Después.')
      setSaving(false)
      return
    }

    if (isCorrection && !correctionRecord?.id) {
      setErrorMsg('No se encontró el registro a corregir.')
      setSaving(false)
      return
    }

    const now = new Date()
    const uuid = crypto.randomUUID()

    try {
      if (isOnline) {
        const [upAntes, upDurante, upDespues] = await Promise.all([
          api.uploadEvidence(user.token, evidenceFiles.antes!),
          api.uploadEvidence(user.token, evidenceFiles.durante!),
          api.uploadEvidence(user.token, evidenceFiles.despues!),
        ])
        const evidencePayload = {
          evidencia_antes_url: upAntes.evidencia_url,
          evidencia_durante_url: upDurante.evidencia_url,
          evidencia_despues_url: upDespues.evidencia_url,
          evidencia_url: upDurante.evidencia_url,
        }

        if (isCorrection && correctionRecord?.id) {
          await api.submitCorrection(user.token, correctionRecord.id, {
            lubricant_id: data.lubricant_id,
            cantidad: data.cantidad,
            unidad: data.unidad,
            observaciones: data.observaciones || null,
            ...evidencePayload,
          })
          setMessage('Corrección enviada. El supervisor volverá a validar el mismo OT.')
        } else {
          await api.createRecord(user.token, {
            uuid_local: uuid,
            area_id: data.area_id,
            machine_id: data.machine_id,
            ot: data.ot,
            lubricant_id: data.lubricant_id,
            cantidad: data.cantidad,
            unidad: data.unidad,
            fecha_registro: now.toISOString().split('T')[0],
            hora_registro: now.toTimeString().slice(0, 8),
            observaciones: data.observaciones || null,
            ...evidencePayload,
          })
          setMessage('Registro guardado y sincronizado correctamente.')
        }
      } else {
        await persistOffline(uuid, data, now, isCorrection ? correctionRecord?.id : undefined)
        setMessage(
          isCorrection
            ? 'Corrección guardada offline con fotos. Se sincronizará al recuperar conexión.'
            : 'Registro guardado offline con fotos. Se sincronizará al recuperar conexión.',
        )
      }

      setTimeout(() => navigate('/historial'), 1500)
    } catch {
      try {
        await persistOffline(uuid, data, now, isCorrection ? correctionRecord?.id : undefined)
        setMessage('Guardado localmente con fotos por error de conexión.')
      } catch {
        setErrorMsg('No se pudo guardar el registro ni las fotos localmente.')
      }
    } finally {
      setSaving(false)
    }
  }

  const now = new Date()

  return (
    <div className="pb-28">
      <ConnectionBanner />
      <PageHeader
        title={isCorrection ? 'Corregir lubricación' : 'Nueva lubricación'}
        subtitle={
          isCorrection
            ? `Mismo OT ${correctionRecord?.ot || ''} — actualiza datos y evidencia`
            : isOnline
              ? 'Registra el trabajo realizado en terreno'
              : 'Modo offline — registro y fotos se guardan en el dispositivo'
        }
        backTo={isCorrection && correctionRecord?.id ? `/registros/${correctionRecord.id}` : '/'}
        backLabel={isCorrection ? 'Registro' : 'Inicio'}
      />

      {loadingCorrection && (
        <p className="text-sm text-slate-500 mb-4">Cargando registro a corregir...</p>
      )}

      {isCorrection && correctionRecord?.comentario_supervisor && (
        <div className="app-card border-[#004A99]/30 bg-blue-50 p-4 mb-4">
          <p className="text-sm font-semibold text-[#004A99] mb-1">Corrección solicitada por supervisor</p>
          <p className="text-sm text-slate-700">{correctionRecord.comentario_supervisor}</p>
          {correctionRecord.supervisor_nombre && (
            <p className="text-xs text-slate-500 mt-2">— {correctionRecord.supervisor_nombre}</p>
          )}
        </div>
      )}

      {/* Progreso visual */}
      <div className="flex gap-2 mb-5">
        <StepPill n={1} label="Ubicación" active={progress >= 0} done={progress >= 1} />
        <StepPill n={2} label="Lubricación" active={progress >= 1} done={progress >= 2} />
        <StepPill n={3} label="Evidencia" active={progress >= 2} done={progress >= 3} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        {/* ── Sección 1: Ubicación ── */}
        <section className="app-card p-5">
          <SectionHeader
            step={1}
            title="Ubicación"
            subtitle="Selecciona el área y la máquina lubricada"
            icon={<IconLocation />}
          />

          <div className="space-y-4 mt-4">
            <Field label="Área" required error={errors.area_id?.message}>
              <select
                {...register('area_id', {
                  required: 'Selecciona un área',
                  validate: (v) => v > 0 || 'Selecciona un área',
                  valueAsNumber: true,
                })}
                className="field-input"
                disabled={isCorrection}
                onChange={(e) => {
                  setValue('area_id', Number(e.target.value))
                  setValue('machine_id', 0)
                }}
              >
                <option value={0}>Seleccionar área de trabajo</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              {selectedAreaData && (
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <AreaIcon nombre={selectedAreaData.nombre} index={areaIndex} size="sm" />
                  <span>{selectedAreaData.descripcion || `${selectedAreaData.machine_count} máquinas`}</span>
                </div>
              )}
            </Field>

            <Field label="Máquina" required error={errors.machine_id?.message}>
              <select
                {...register('machine_id', {
                  required: 'Selecciona una máquina',
                  validate: (v) => v > 0 || 'Selecciona una máquina',
                  valueAsNumber: true,
                })}
                className="field-input"
                disabled={!selectedArea || isCorrection}
              >
                <option value={0}>
                  {!selectedArea ? 'Primero selecciona un área' : 'Seleccionar máquina'}
                </option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} — {m.tag}
                    {m.cumplimiento === 'atrasado' ? ' ⚠' : ''}
                  </option>
                ))}
              </select>
            </Field>

            {selectedMachine && (
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex gap-0">
                <MediaImage
                  src={selectedMachine.foto_url}
                  alt={selectedMachine.nombre}
                  className="w-24 h-24 shrink-0"
                />
                <div className="p-3 flex-1 min-w-0">
                  <div className="flex justify-between gap-2 items-start">
                    <p className="font-semibold text-sm text-slate-800 truncate">{selectedMachine.nombre}</p>
                    <ComplianceBadge status={selectedMachine.cumplimiento} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">TAG: {selectedMachine.tag}</p>
                  {selectedMachine.lubricante_recomendado_nombre && (
                    <p className="text-xs text-[#004A99] mt-1.5 font-medium">
                      Recomendado: {selectedMachine.lubricante_recomendado_nombre}
                    </p>
                  )}
                  {selectedMachine.frecuencia_dias && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Frecuencia: cada {selectedMachine.frecuencia_dias} días
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Sección 2: Lubricación ── */}
        <section className="app-card p-5">
          <SectionHeader
            step={2}
            title="Datos de lubricación"
            subtitle="OT, lubricante y cantidad aplicada"
            icon={<IconDroplet />}
          />

          <div className="space-y-4 mt-4">
            <Field label="Número OT" required error={errors.ot?.message}>
              <div className="flex gap-2">
                <input
                  {...register('ot', { required: 'Ingresa el número de OT' })}
                  className="field-input flex-1"
                  placeholder="Ej: LUB-20250605-TAG-BH01"
                  readOnly={isCorrection}
                />
                <button
                  type="button"
                  onClick={suggestOt}
                  disabled={!selectedMachine || isCorrection}
                  className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border-2 border-[#004A99] text-[#004A99] hover:bg-[#004A99]/5 disabled:opacity-40 transition"
                  title="Generar OT automática"
                >
                  Auto
                </button>
              </div>
            </Field>

            <Field label="Lubricante" required error={errors.lubricant_id?.message}>
              <select
                {...register('lubricant_id', {
                  required: 'Selecciona un lubricante',
                  validate: (v) => v > 0 || 'Selecciona un lubricante',
                  valueAsNumber: true,
                })}
                className="field-input"
              >
                <option value={0}>Seleccionar lubricante</option>
                {lubricants.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre} ({l.codigo}) — {l.unidad_default}
                  </option>
                ))}
              </select>
              {selectedMachine?.lubricante_recomendado_id === selectedLubricantId && (
                <p className="text-xs text-[#2e7d32] mt-1.5 flex items-center gap-1">
                  <IconCheck /> Lubricante recomendado para esta máquina
                </p>
              )}
              {selectedLubricant && (
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden flex gap-0 bg-slate-50">
                  <MediaImage
                    src={selectedLubricant.foto_url}
                    alt={selectedLubricant.nombre}
                    className="w-20 h-20 shrink-0"
                    fallback="🛢️"
                  />
                  <div className="p-3 flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800">{selectedLubricant.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Código {selectedLubricant.codigo} · Unidad {selectedLubricant.unidad_default}
                    </p>
                    {selectedLubricant.descripcion && (
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                        {selectedLubricant.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad" required error={errors.cantidad?.message}>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  {...register('cantidad', {
                    required: 'Ingresa la cantidad',
                    valueAsNumber: true,
                    min: { value: 0.1, message: 'Mínimo 0.1' },
                  })}
                  className="field-input"
                  placeholder="0"
                />
              </Field>
              <Field label="Unidad">
                <select {...register('unidad')} className="field-input">
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="oz">oz</option>
                </select>
              </Field>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              <IconClock />
              <span>
                Fecha: {now.toLocaleDateString('es-CL')} · Hora: {now.toTimeString().slice(0, 5)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Sección 3: Evidencia ── */}
        <section className="app-card p-5">
          <SectionHeader
            step={3}
            title="Evidencia y observaciones"
            subtitle="3 fotos obligatorias: Antes, Durante y Después"
            icon={<IconCamera />}
          />

          <div className="space-y-4 mt-4">
            <Field
              label="Fotos de evidencia"
              required
              hint="Las 3 fotos son obligatorias (también en modo offline; se suben al sincronizar)"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EVIDENCE_PHASES.map((phase) => {
                  const preview = evidencePreviews[phase.key]
                  return (
                    <div key={phase.key} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-center py-1.5 bg-slate-50 text-slate-600 border-b border-slate-100">
                        {phase.label}
                        <span className="text-red-500 ml-0.5">*</span>
                      </p>
                      {preview ? (
                        <div className="relative">
                          <img src={preview} alt={`Vista previa ${phase.label}`} className="w-full h-28 object-cover" />
                          <button
                            type="button"
                            onClick={() => handleEvidence(phase.key, null)}
                            className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-lg shadow"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-200 m-2 rounded-lg p-3 text-center bg-slate-50 hover:border-[#004A99]/40 hover:bg-[#004A99]/5 transition cursor-pointer block">
                          <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-[#004A99]/10 text-[#004A99] flex items-center justify-center">
                            <IconCameraSmall />
                          </div>
                          <p className="text-[11px] font-semibold text-slate-700">Tomar foto</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{phase.hint}</p>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleEvidence(phase.key, e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
              {!isOnline && (
                <p className="text-xs text-emerald-700 mt-1.5">
                  Sin conexión: las fotos se guardan en el dispositivo y se suben al sincronizar.
                </p>
              )}
            </Field>

            <Field label="Observaciones" hint="Detalles del punto lubricado, anomalías, etc.">
              <textarea
                {...register('observaciones')}
                className="field-input min-h-[80px]"
                placeholder="Ej: Se lubricó rodamiento lateral, sin fugas detectadas..."
                rows={3}
              />
            </Field>
          </div>
        </section>

        {errorMsg && (
          <p className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5">
            {errorMsg}
          </p>
        )}
        {message && (
          <p className="text-sm bg-[#4CAF50]/10 border border-[#4CAF50]/30 text-[#2e7d32] rounded-xl px-4 py-2.5 flex items-center gap-2">
            <IconCheck />
            {message}
          </p>
        )}

        {/* Barra fija de guardado */}
        <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-slate-200 z-40">
          <div className="max-w-lg mx-auto">
            <button
              type="submit"
              disabled={saving}
              className="w-full app-btn-accent flex items-center justify-center gap-2 disabled:opacity-50 py-3.5"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <IconSave />
                  {isCorrection
                    ? isOnline
                      ? 'Enviar corrección'
                      : 'Guardar corrección offline'
                    : isOnline
                      ? 'Guardar lubricación'
                      : 'Guardar offline'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SectionHeader({
  step,
  title,
  subtitle,
  icon,
}: {
  step: number
  title: string
  subtitle: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#004A99]/10 text-[#004A99] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider">Paso {step}</p>
        <p className="font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function StepPill({
  n,
  label,
  active,
  done,
}: {
  n: number
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div
      className={`flex-1 text-center py-2 px-1 rounded-xl text-[10px] font-semibold transition ${
        done
          ? 'bg-[#4CAF50]/15 text-[#2e7d32]'
          : active
            ? 'bg-[#004A99]/10 text-[#004A99]'
            : 'bg-slate-100 text-slate-400'
      }`}
    >
      <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] mr-0.5 ${
        done ? 'bg-[#4CAF50] text-white' : active ? 'bg-[#004A99] text-white' : 'bg-slate-300 text-white'
      }`}>
        {done ? '✓' : n}
      </span>
      {label}
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
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
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function IconLocation() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconDroplet() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconCameraSmall() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  )
}
