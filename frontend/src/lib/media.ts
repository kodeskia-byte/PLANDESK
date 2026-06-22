export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url

  const uploadsOrigin = import.meta.env.VITE_UPLOADS_ORIGIN || ''
  if (url.startsWith('/uploads') && uploadsOrigin) {
    return `${uploadsOrigin.replace(/\/$/, '')}${url}`
  }

  return url.startsWith('/') ? url : `/${url}`
}
