interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'amber' | 'red'
  size?: 'default' | 'compact'
}

const colors = {
  blue: 'border-[#004A99]/20 bg-[#004A99]/5 text-[#004A99]',
  green: 'border-[#4CAF50]/30 bg-[#4CAF50]/10 text-[#2e7d32]',
  amber: 'border-[#F39200]/30 bg-[#F39200]/10 text-[#c67600]',
  red: 'border-red-200 bg-red-50 text-red-600',
}

const valueColors = {
  blue: 'text-[#004A99]',
  green: 'text-[#2e7d32]',
  amber: 'text-[#c67600]',
  red: 'text-red-600',
}

export default function KpiCard({
  title,
  value,
  subtitle,
  color = 'blue',
  size = 'default',
}: KpiCardProps) {
  const valueSize = size === 'compact' ? 'text-xl sm:text-2xl' : 'text-2xl'

  return (
    <div className={`app-card p-3 sm:p-4 border-2 min-w-0 ${colors[color]}`}>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide opacity-80 truncate">
        {title}
      </p>
      <p className={`${valueSize} font-bold mt-1 truncate ${valueColors[color]}`}>{value}</p>
      {subtitle && (
        <p className="text-[10px] sm:text-xs opacity-70 mt-1 leading-snug">{subtitle}</p>
      )}
    </div>
  )
}
