import KpiCard from './KpiCard'
import type { ReportPreview } from '../types'

interface ReportKpiSummaryProps {
  preview: ReportPreview
}

export default function ReportKpiSummary({ preview }: ReportKpiSummaryProps) {
  const tasaValidacion =
    preview.total > 0 ? Math.round((preview.validados / preview.total) * 100) : 0

  return (
    <section className="mb-6">
      <p className="app-section-title mb-3">Resumen del período</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard title="Total registros" value={preview.total} color="blue" />
        <KpiCard title="Validados" value={preview.validados} color="green" subtitle={`${tasaValidacion}% del total`} />
        <KpiCard
          title="Pendientes"
          value={preview.pendientes}
          color={preview.pendientes > 0 ? 'amber' : 'green'}
        />
        <KpiCard
          title="Rechazados"
          value={preview.rechazados}
          color={preview.rechazados > 0 ? 'red' : 'green'}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Correcciones"
          value={preview.correcciones ?? 0}
          color={(preview.correcciones ?? 0) > 0 ? 'amber' : 'blue'}
        />
        <KpiCard
          title="Consumo total"
          value={preview.consumo_total}
          color="blue"
          subtitle="Unidades registradas"
        />
        <KpiCard
          title="Evidencia completa"
          value={preview.evidencia_completa ?? preview.con_evidencia}
          color="green"
          subtitle={
            preview.porcentaje_evidencia_completa != null
              ? `${preview.porcentaje_evidencia_completa}% con 3 fotos (Antes/Durante/Después)`
              : `${preview.porcentaje_evidencia}% · ${preview.con_evidencia} de ${preview.total}`
          }
        />
        <KpiCard
          title="Sin evidencia completa"
          value={preview.total - (preview.evidencia_completa ?? preview.con_evidencia)}
          color={
            preview.total - (preview.evidencia_completa ?? preview.con_evidencia) > 0 ? 'amber' : 'green'
          }
          subtitle="Faltan fotos Antes, Durante o Después"
        />
      </div>
    </section>
  )
}
