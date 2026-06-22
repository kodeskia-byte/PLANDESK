import type { EvidencePhase } from '../components/EvidenceViewer'
import { api } from './api'
import {
  countPending,
  getPendingEvidenceForRecord,
  getPendingRecords,
  markRecordSynced,
  type PendingRecord,
} from './db'
import type { AuthUser, LubricationRecord } from '../types'

async function uploadEvidencePhases(
  token: string,
  uuid: string,
  record: PendingRecord,
): Promise<{
  evidencia_antes_url: string | null
  evidencia_durante_url: string | null
  evidencia_despues_url: string | null
  evidencia_url: string | null
}> {
  const stored = await getPendingEvidenceForRecord(uuid)
  const urls: Record<EvidencePhase, string | null> = {
    antes: record.evidencia_antes_url ?? null,
    durante: record.evidencia_durante_url ?? null,
    despues: record.evidencia_despues_url ?? null,
  }

  for (const item of stored) {
    const file = new File([item.blob], `${item.phase}.jpg`, { type: item.mime_type })
    const uploaded = await api.uploadEvidence(token, file)
    urls[item.phase] = uploaded.evidencia_url
  }

  return {
    evidencia_antes_url: urls.antes,
    evidencia_durante_url: urls.durante,
    evidencia_despues_url: urls.despues,
    evidencia_url: urls.durante,
  }
}

async function syncOneRecord(user: AuthUser, pending: PendingRecord): Promise<boolean> {
  const evidence = await uploadEvidencePhases(user.token, pending.uuid_local, pending)
  const hasAllEvidence =
    evidence.evidencia_antes_url && evidence.evidencia_durante_url && evidence.evidencia_despues_url

  if (!hasAllEvidence) return false

  if (pending.correction_of_id) {
    await api.submitCorrection(user.token, pending.correction_of_id, {
      lubricant_id: pending.lubricant_id,
      cantidad: pending.cantidad,
      unidad: pending.unidad,
      observaciones: pending.observaciones ?? null,
      evidencia_url: evidence.evidencia_url,
      evidencia_antes_url: evidence.evidencia_antes_url,
      evidencia_durante_url: evidence.evidencia_durante_url,
      evidencia_despues_url: evidence.evidencia_despues_url,
    })
  } else {
    const payload: LubricationRecord = {
      ...pending,
      ...evidence,
    }
    await api.syncRecords(user.token, [payload])
  }

  await markRecordSynced(pending.uuid_local)
  return true
}

export async function syncPendingRecords(user: AuthUser): Promise<number> {
  if (!navigator.onLine) return 0

  const pending = await getPendingRecords()
  if (pending.length === 0) return 0

  let synced = 0
  for (const record of pending) {
    try {
      const ok = await syncOneRecord(user, record)
      if (ok) synced += 1
    } catch {
      // keep pending for next attempt
    }
  }
  return synced
}

export async function getPendingCount(): Promise<number> {
  return countPending()
}
