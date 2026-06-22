import { useState } from 'react'
import MediaImage from './MediaImage'
import { mediaUrl } from '../lib/media'

export type EvidencePhase = 'antes' | 'durante' | 'despues'

const PHASE_LABELS: Record<EvidencePhase, string> = {
  antes: 'Antes',
  durante: 'Durante',
  despues: 'Después',
}

interface EvidenceViewerProps {
  antes?: string | null
  durante?: string | null
  despues?: string | null
  /** Compatibilidad registros antiguos */
  url?: string | null
  compact?: boolean
}

export default function EvidenceViewer({
  antes,
  durante,
  despues,
  url,
  compact = false,
}: EvidenceViewerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const items: { phase: EvidencePhase; label: string; src: string | null | undefined }[] = [
    { phase: 'antes', label: PHASE_LABELS.antes, src: antes },
    { phase: 'durante', label: PHASE_LABELS.durante, src: durante || url },
    { phase: 'despues', label: PHASE_LABELS.despues, src: despues },
  ]

  const withPhoto = items.filter((item) => mediaUrl(item.src))
  if (withPhoto.length === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? 'p-3' : 'p-6'}`}>
        <p className="text-xs text-slate-400">Sin evidencia fotográfica (Antes / Durante / Después)</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Evidencia fotográfica
      </p>
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {items.map((item) => {
          const src = mediaUrl(item.src)
          return (
            <div key={item.phase} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <p className="text-[10px] font-bold uppercase tracking-wide text-center py-1.5 bg-slate-50 text-slate-600 border-b border-slate-100">
                {item.label}
              </p>
              {src ? (
                <button
                  type="button"
                  onClick={() => setExpanded(src)}
                  className="block w-full"
                >
                  <MediaImage
                    src={item.src}
                    alt={`Evidencia ${item.label}`}
                    className={`w-full ${compact ? 'h-24' : 'h-32 sm:h-36'}`}
                  />
                </button>
              ) : (
                <div className={`flex items-center justify-center text-[10px] text-slate-400 ${compact ? 'h-24' : 'h-32 sm:h-36'}`}>
                  Sin foto
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">Toca una imagen para ampliar</p>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpanded(null)}
        >
          <img
            src={expanded}
            alt="Evidencia ampliada"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 text-xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
