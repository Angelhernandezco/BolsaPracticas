import {
  Building2,
  CheckCircle2,
  Clock3,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../app/AuthContext'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ControlButton,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  QueryError,
  Select,
  Textarea,
  Title,
} from '../components/ui'
import { api, getErrorMessage } from '../services/api'
import type { ApprovalStatus, CompanyReview } from '../types'

function AdminHeader({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="dashboard-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <Title>{title}</Title>
        <p>{text}</p>
      </div>
      {action}
    </div>
  )
}

export function AdminDashboard() {
  const [companies, setCompanies] = useState<CompanyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true)
    setError('')
    api
      .listCompanies()
      .then(setCompanies)
      .catch((err) =>
        setError(getErrorMessage(err, 'No pudimos cargar las empresas.')),
      )
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  if (loading && !companies.length) return <LoadingState />
  if (error)
    return (
      <div className="dashboard-page">
        <QueryError message={error} onRetry={load} />
      </div>
    )
  return (
    <div className="dashboard-page">
      <AdminHeader
        eyebrow="Administración"
        title="Resumen administrativo"
        text="Consulta empresas y resuelve solicitudes de registro. Este panel no administra estudiantes ni convocatorias."
      />
      {!companies.length ? (
        <EmptyState
          icon={<Building2 />}
          title="No hay empresas registradas"
          text="Las empresas aparecerán aquí cuando completen su registro."
        />
      ) : (
        <>
          <div className="metric-grid">
            <Card className="metric-card">
              <div className="metric-icon blue">
                <Building2 />
              </div>
              <div>
                <span>Empresas</span>
                <strong>{companies.length}</strong>
                <small>registradas</small>
              </div>
            </Card>
            <Card className="metric-card">
              <div className="metric-icon amber">
                <Clock3 />
              </div>
              <div>
                <span>Solicitudes pendientes</span>
                <strong>
                  {
                    companies.filter(
                      (item) => item.approvalStatus === 'pending',
                    ).length
                  }
                </strong>
                <small>por revisar</small>
              </div>
            </Card>
            <Card className="metric-card">
              <div className="metric-icon green">
                <CheckCircle2 />
              </div>
              <div>
                <span>Aprobadas</span>
                <strong>
                  {
                    companies.filter(
                      (item) => item.approvalStatus === 'approved',
                    ).length
                  }
                </strong>
                <small>con acceso empresarial</small>
              </div>
            </Card>
          </div>
          <div className="benefit-grid">
            <Card>
              <Title as="h2">Empresas</Title>
              <p>Consulta el directorio y administra sus fechas de convenio.</p>
              <Link
                className="button button-secondary mt-2"
                to="/admin/empresas"
              >
                Ver empresas
              </Link>
            </Card>
            <Card>
              <Title as="h2">Solicitudes pendientes</Title>
              <p>
                Revisa solicitudes con correo verificado y emite una resolución.
              </p>
              <Link
                className="button button-primary mt-2"
                to="/admin/solicitudes"
              >
                Revisar solicitudes
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export { default as AdminCompanies } from './admin/AdminCompaniesPage'
export { default as AdminRequests } from './admin/AdminRequestsPage'
