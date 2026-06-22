const STYLES: Record<string, string> = {
  validado: 'app-badge-validado',
  rechazado: 'app-badge-rechazado',
  pendiente: 'app-badge-pendiente',
  correccion_solicitada: 'bg-blue-50 text-[#004A99] border border-[#004A99]/30',
  local: 'app-badge-local',
  sincronizado: 'app-badge-validado',
  error: 'app-badge-rechazado',
}

export default function StatusBadge({ label }: { label: string }) {
  const key = label.toLowerCase().replace(/\s/g, '_')
  const style = STYLES[key] || 'app-badge-local'
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${style}`}>
      {label.replace(/_/g, ' ')}
    </span>
  )
}
