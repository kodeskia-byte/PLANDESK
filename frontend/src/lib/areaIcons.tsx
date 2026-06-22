import type { ReactNode } from 'react'

export type AreaIconType = 'linea' | 'secado' | 'caldera' | 'mantenimiento' | 'general'

const KEYWORDS: [RegExp, AreaIconType][] = [
  [/l[ií]nea|producci[oó]n/i, 'linea'],
  [/secado|secador/i, 'secado'],
  [/caldera|vapor|horno/i, 'caldera'],
  [/mantenimiento|taller|bodega/i, 'mantenimiento'],
]

export function getAreaIconType(nombre: string, index = 0): AreaIconType {
  for (const [pattern, type] of KEYWORDS) {
    if (pattern.test(nombre)) return type
  }
  const fallbacks: AreaIconType[] = ['linea', 'secado', 'caldera', 'mantenimiento', 'general']
  return fallbacks[index % fallbacks.length]
}

const ICON_LABELS: Record<AreaIconType, string> = {
  linea: 'Línea de producción',
  secado: 'Proceso de secado',
  caldera: 'Sistema de calderas',
  mantenimiento: 'Taller / mantenimiento',
  general: 'Área industrial',
}

export function getAreaIconLabel(type: AreaIconType): string {
  return ICON_LABELS[type]
}

interface AreaIconProps {
  nombre: string
  index?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  bare?: boolean
}

const SIZES = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

const SVG_SIZES = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function AreaIcon({ nombre, index = 0, size = 'md', className = '', bare = false }: AreaIconProps) {
  const type = getAreaIconType(nombre, index)
  const icon = <span className={SVG_SIZES[size]}>{ICONS[type]}</span>
  if (bare) {
    return <span className={`inline-flex shrink-0 ${className}`} aria-hidden>{icon}</span>
  }
  return (
    <div
      className={`${SIZES[size]} rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      {icon}
    </div>
  )
}

const ICONS: Record<AreaIconType, ReactNode> = {
  linea: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  secado: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  caldera: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  mantenimiento: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  general: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
}
