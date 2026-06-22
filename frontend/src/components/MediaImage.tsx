import { useState, type ReactNode } from 'react'
import { mediaUrl } from '../lib/media'

interface MediaImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallback?: ReactNode
}

export default function MediaImage({ src, alt, className = '', fallback }: MediaImageProps) {
  const [error, setError] = useState(false)
  const url = mediaUrl(src)

  if (!url || error) {
    return (
      <div className={`bg-[#004A99]/8 flex items-center justify-center text-4xl ${className}`}>
        {fallback ?? '⚙️'}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  )
}
