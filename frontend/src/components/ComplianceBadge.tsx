const STYLES: Record<string, { label: string; className: string }> = {
  al_dia: { label: 'Al día', className: 'bg-[#4CAF50]/15 text-[#2e7d32] border-[#4CAF50]/30' },
  proximo: { label: 'Próximo vencimiento', className: 'bg-[#F39200]/15 text-[#c67600] border-[#F39200]/30' },
  atrasado: { label: 'Atrasado', className: 'bg-red-50 text-red-600 border-red-200' },
  sin_registro: { label: 'Sin lubricación', className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

export default function ComplianceBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const cfg = STYLES[status] || STYLES.sin_registro
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
