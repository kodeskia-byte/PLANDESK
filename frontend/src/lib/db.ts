import Dexie, { type Table } from 'dexie'
import type { EvidencePhase } from '../components/EvidenceViewer'
import type { LubricationRecord } from '../types'

export interface PendingRecord extends LubricationRecord {
  uuid_local: string
  estado_sincronizacion: 'local' | 'pendiente' | 'error'
  created_at_local: string
  /** ID del registro en servidor que se está corrigiendo */
  correction_of_id?: number
}

export interface PendingEvidence {
  uuid_local: string
  phase: EvidencePhase
  blob: Blob
  mime_type: string
}

class ShekinaDB extends Dexie {
  pendingRecords!: Table<PendingRecord, string>
  pendingEvidence!: Table<PendingEvidence, [string, EvidencePhase]>

  constructor() {
    super('ShekinaSmartLub')
    this.version(1).stores({
      pendingRecords: 'uuid_local, area_id, machine_id, estado_sincronizacion',
    })
    this.version(2).stores({
      pendingRecords: 'uuid_local, area_id, machine_id, estado_sincronizacion, correction_of_id',
      pendingEvidence: '[uuid_local+phase], uuid_local',
    })
  }
}

export const db = new ShekinaDB()

export async function savePendingRecord(record: PendingRecord) {
  await db.pendingRecords.put(record)
}

export async function savePendingEvidence(uuid: string, phase: EvidencePhase, file: File) {
  await db.pendingEvidence.put({
    uuid_local: uuid,
    phase,
    blob: file,
    mime_type: file.type || 'image/jpeg',
  })
}

export async function saveAllPendingEvidence(
  uuid: string,
  files: Record<EvidencePhase, File | null>,
) {
  for (const phase of ['antes', 'durante', 'despues'] as EvidencePhase[]) {
    const file = files[phase]
    if (file) await savePendingEvidence(uuid, phase, file)
  }
}

export async function getPendingEvidenceForRecord(uuid: string) {
  return db.pendingEvidence.where('uuid_local').equals(uuid).toArray()
}

export async function deletePendingEvidence(uuid: string) {
  await db.pendingEvidence.where('uuid_local').equals(uuid).delete()
}

export async function getPendingRecords() {
  return db.pendingRecords
    .where('estado_sincronizacion')
    .anyOf(['local', 'pendiente', 'error'])
    .toArray()
}

export async function markRecordSynced(uuid: string) {
  await db.pendingRecords.delete(uuid)
  await deletePendingEvidence(uuid)
}

export async function countPending() {
  return db.pendingRecords
    .where('estado_sincronizacion')
    .anyOf(['local', 'pendiente', 'error'])
    .count()
}
