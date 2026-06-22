import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
}

export default function PageHeader({ title, subtitle, backTo, backLabel = 'Volver' }: PageHeaderProps) {
  return (
    <div className="mb-5">
      {backTo && (
        <Link to={backTo} className="app-btn-ghost inline-flex items-center gap-1 mb-2">
          ← {backLabel}
        </Link>
      )}
      <h1 className="app-page-title">{title}</h1>
      {subtitle && <p className="app-page-subtitle">{subtitle}</p>}
    </div>
  )
}
