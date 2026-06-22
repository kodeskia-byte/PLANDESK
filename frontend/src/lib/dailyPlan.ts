import type { LubricationRecord, Machine } from '../types'

export type Turno = 'mañana' | 'tarde' | 'noche'

const PRIORITY: Record<string, number> = {
  atrasado: 0,
  sin_registro: 1,
  proximo: 2,
  al_dia: 3,
}

export function currentTurno(date = new Date()): Turno {
  const hour = date.getHours()
  if (hour >= 6 && hour < 14) return 'mañana'
  if (hour >= 14 && hour < 22) return 'tarde'
  return 'noche'
}

export const TURNO_LABELS: Record<Turno, string> = {
  mañana: 'Turno mañana (06:00–13:59)',
  tarde: 'Turno tarde (14:00–21:59)',
  noche: 'Turno noche (22:00–05:59)',
}

export interface DailyPlanItem {
  kind: 'machine' | 'correction'
  priority: number
  machine?: Machine
  record?: LubricationRecord
}

export function buildDailyPlan(
  machines: Machine[],
  corrections: LubricationRecord[] = [],
): DailyPlanItem[] {
  const items: DailyPlanItem[] = []

  for (const record of corrections) {
    items.push({
      kind: 'correction',
      priority: -1,
      record,
    })
  }

  for (const machine of machines) {
    if (machine.cumplimiento === 'al_dia') continue
    items.push({
      kind: 'machine',
      priority: PRIORITY[machine.cumplimiento || 'proximo'] ?? 9,
      machine,
    })
  }

  return items.sort((a, b) => a.priority - b.priority)
}
