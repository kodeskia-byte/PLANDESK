import { Link } from 'react-router-dom'
import ConnectionBanner from '../../components/ConnectionBanner'
import PageHeader from '../../components/PageHeader'

const MODULES = [
  {
    to: '/admin/usuarios',
    title: 'Usuarios',
    description: 'Crear, editar, asignar áreas y reiniciar PIN',
    color: 'bg-[#004A99]',
  },
  {
    to: '/admin/areas',
    title: 'Áreas',
    description: 'Gestionar áreas de trabajo y su estado',
    color: 'bg-[#F39200]',
  },
  {
    to: '/admin/maquinas',
    title: 'Máquinas',
    description: 'Alta, edición, foto y frecuencia de lubricación',
    color: 'bg-[#4CAF50]',
  },
  {
    to: '/admin/lubricantes',
    title: 'Lubricantes',
    description: 'Catálogo de lubricantes y unidades',
    color: 'bg-slate-600',
  },
]

export default function AdminPage() {
  return (
    <div>
      <ConnectionBanner />
      <PageHeader
        title="Administración"
        subtitle="Gestión de usuarios, áreas, máquinas y lubricantes"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="app-card-hover p-5 flex gap-4 items-start"
          >
            <div className={`w-12 h-12 rounded-xl ${m.color} text-white flex items-center justify-center font-bold text-lg shrink-0`}>
              {m.title[0]}
            </div>
            <div>
              <p className="font-bold text-slate-800">{m.title}</p>
              <p className="text-sm text-slate-500 mt-1">{m.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
