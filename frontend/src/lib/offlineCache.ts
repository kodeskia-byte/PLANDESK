import type { Area, Lubricant, LubricationRecord, Machine } from '../types'

const AREAS_KEY = 'shekina_cache_areas'
const LUBRICANTS_KEY = 'shekina_cache_lubricants'
const machinesKey = (areaId: number) => `shekina_cache_machines_${areaId}`

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

export function cacheAreas(areas: Area[]) {
  writeJson(AREAS_KEY, areas)
}

export function getCachedAreas(): Area[] {
  return readJson<Area[]>(AREAS_KEY) ?? []
}

export function cacheLubricants(lubricants: Lubricant[]) {
  writeJson(LUBRICANTS_KEY, lubricants)
}

export function getCachedLubricants(): Lubricant[] {
  return readJson<Lubricant[]>(LUBRICANTS_KEY) ?? []
}

export function cacheMachines(areaId: number, machines: Machine[]) {
  writeJson(machinesKey(areaId), machines)
}

export function getCachedMachines(areaId: number): Machine[] {
  return readJson<Machine[]>(machinesKey(areaId)) ?? []
}

const correctionKey = (id: number) => `shekina_cache_correction_${id}`

export function cacheCorrectionRecord(record: LubricationRecord) {
  if (record.id) writeJson(correctionKey(record.id), record)
}

export function getCachedCorrectionRecord(id: number): LubricationRecord | null {
  return readJson<LubricationRecord>(correctionKey(id))
}
