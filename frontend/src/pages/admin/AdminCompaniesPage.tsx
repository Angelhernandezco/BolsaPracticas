import { useCallback, useEffect, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { useAuth } from '../../app/AuthContext'
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
  Title,
} from '../../components/ui'
import CompanyDetails, { approvalMeta } from '../../components/CompanyDetails'
import ApprovalNotification from '../../components/ApprovalNotification'
import AgreementBadge from '../../components/AgreementBadge'
import AgreementDatesFields from '../../components/AgreementDatesFields'
import useLocalCalendarDate from '../../hooks/useLocalCalendarDate'
import {
  agreementDates,
  agreementDateError,
  getAgreementStatus,
} from '../../lib/agreements'
import { api, formatCalendarDate, getErrorMessage } from '../../services/api'
import type { AgreementDates, CompanyReview } from '../../types'

export default function AdminCompaniesPage() {
  const { user } = useAuth()
  const today = useLocalCalendarDate()
  const [companies, setCompanies] = useState<CompanyReview[]>([])
  const [selected, setSelected] = useState<CompanyReview | null>(null)
  const [editing, setEditing] = useState<CompanyReview | null>(null)
  const [dates, setDates] = useState<AgreementDates>(agreementDates({}))
  const [loading, setLoading] = useState(true)
  const [queryError, setQueryError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [agreementStatus, setAgreementStatus] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setQueryError('')
    try {
      setCompanies(await api.listCompanies())
    } catch (error) {
      setQueryError(getErrorMessage(error, 'No pudimos cargar las empresas.'))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  function edit(company: CompanyReview) {
    setEditing(company)
    setDates(agreementDates(company))
    setMutationError('')
  }
  async function save() {
    if (!editing || !user || saving) return
    const validation = agreementDateError(dates)
    if (validation) {
      setMutationError(validation)
      return
    }
    setSaving(true)
    setMutationError('')
    try {
      const updated = await api.setCompanyAgreement(editing.id, dates, user)
      setCompanies((current) =>
        current.map((company) =>
          company.id === updated.id ? updated : company,
        ),
      )
      if (selected?.id === updated.id) setSelected(updated)
      setEditing(null)
    } catch (error) {
      setMutationError(
        getErrorMessage(error, 'No pudimos guardar las fechas del convenio.'),
      )
    } finally {
      setSaving(false)
    }
  }
  const filtered = companies.filter(
    (company) =>
      `${company.name} ${company.rfc} ${company.email}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!status || company.approvalStatus === status) &&
      (!agreementStatus ||
        getAgreementStatus(agreementDates(company), today) === agreementStatus),
  )
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Directorio</span>
          <Title>Empresas</Title>
          <p>
            Consulta los perfiles y administra las fechas de convenio con la
            UAS.
          </p>
        </div>
      </div>
      <Card className="filter-bar company-filters">
        <Field label="Buscar empresa">
          <div className="input-with-icon">
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, RFC o correo"
            />
          </div>
        </Field>
        <Field label="Estado de solicitud">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
          </Select>
        </Field>
        <Field label="Estado del convenio">
          <Select
            value={agreementStatus}
            onChange={(event) => setAgreementStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="none">Sin convenio</option>
            <option value="active">Activo</option>
            <option value="expired">Vencido</option>
            <option value="upcoming">Próximo a iniciar</option>
          </Select>
        </Field>
      </Card>
      {loading ? (
        <LoadingState />
      ) : queryError ? (
        <QueryError message={queryError} onRetry={() => void load()} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Building2 />}
          title={
            companies.length
              ? 'No encontramos coincidencias'
              : 'No hay empresas registradas'
          }
          text="Las empresas aparecerán aquí cuando completen su registro."
          action={
            companies.length ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setStatus('')
                  setAgreementStatus('')
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="table-card">
          <div className="data-table agreement-companies-table">
            <div className="table-row table-head">
              <span>Empresa</span>
              <span>Giro</span>
              <span>Inicio de convenio</span>
              <span>Fin de convenio</span>
              <span>Estado del convenio</span>
              <span>Acciones</span>
              <span>Convocatorias</span>
              <span>Solicitud</span>
              <span>Registro</span>
            </div>
            {filtered.map((company) => (
              <div className="table-row admin-company-row" key={company.id}>
                <ControlButton
                  className="table-primary company-open-button"
                  onClick={() => setSelected(company)}
                >
                  <Avatar
                    size="small"
                    src={company.logo}
                    initials={company.name.slice(0, 2).toUpperCase()}
                  />
                  <span>
                    <strong>{company.name}</strong>
                    <small>
                      {company.rfc} · {company.email}
                    </small>
                  </span>
                </ControlButton>
                <span>{company.giro}</span>
                <span>
                  {company.agreementStartDate
                    ? formatCalendarDate(company.agreementStartDate)
                    : '—'}
                </span>
                <span>
                  {company.agreementEndDate
                    ? formatCalendarDate(company.agreementEndDate)
                    : '—'}
                </span>
                <span>
                  <AgreementBadge
                    dates={agreementDates(company)}
                    today={today}
                  />
                </span>
                <Button variant="ghost" onClick={() => edit(company)}>
                  Editar convenio
                </Button>
                <strong>{company.opportunityCount}</strong>
                <span>
                  <Badge
                    tone={
                      approvalMeta[company.approvalStatus || 'pending'].tone
                    }
                  >
                    {approvalMeta[company.approvalStatus || 'pending'].label}
                  </Badge>
                </span>
                <span>
                  {new Date(company.registeredAt).toLocaleDateString('es-MX')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Modal
        open={!!selected && !editing}
        title="Detalle de la empresa"
        onClose={() => setSelected(null)}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => selected && edit(selected)}
            >
              Editar convenio
            </Button>
            <Button onClick={() => setSelected(null)}>Cerrar</Button>
          </>
        }
      >
        {selected && (
          <>
            <CompanyDetails company={selected} />
            <ApprovalNotification
              company={selected}
              onUpdate={(updated) => {
                setSelected(updated)
                setCompanies((current) =>
                  current.map((company) =>
                    company.id === updated.id ? updated : company,
                  ),
                )
              }}
            />
          </>
        )}
      </Modal>
      <Modal
        open={!!editing}
        title="Editar convenio"
        busy={saving}
        onClose={() => setEditing(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setDates(agreementDates({}))}
            >
              Quitar convenio
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Guardar convenio
            </Button>
          </>
        }
      >
        <AgreementDatesFields
          value={dates}
          onChange={setDates}
          disabled={saving}
        />
        {mutationError && (
          <div className="notice warning" role="alert">
            {mutationError}
          </div>
        )}
      </Modal>
    </div>
  )
}
