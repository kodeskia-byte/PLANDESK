const AREA_COLORS = [
  'area-card-blue',
  'area-card-green',
  'area-card-orange',
  'area-card-slate',
  'area-card-teal',
] as const

export function getAreaColor(index: number): string {
  return AREA_COLORS[index % AREA_COLORS.length]
}
