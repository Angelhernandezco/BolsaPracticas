import { AgreementSummary } from '../components/AgreementBadge'
import { agreementDates } from '../lib/agreements'
import { phoneError, rfcError } from '../lib/registration-validation'
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FilePlus2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UploadCloud,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../app/AuthContext'
import ApplicationStatusBadge from '../components/ApplicationStatus'
import {
  Avatar,
  Badge,
  Button,
  Card,
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
import {
  api,
  formatCalendarDate,
  getErrorMessage,
  mazatlanToday,
} from '../services/api'
import type {
  ApplicationStatus,
  Candidate,
  Opportunity,
  CareerDto,
} from '../types'

function Header({
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

export function CompanyDashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true)
    setError('')
    api
      .listOpportunities(true)
      .then((data) =>
        setItems(data.filter((item) => item.companyId === user?.id)),
      )
      .catch((err) =>
        setError(getErrorMessage(err, 'No pudimos cargar tus convocatorias.')),
      )
      .finally(() => setLoading(false))
  }
  useEffect(load, [user])
  if (loading && !items.length) return <LoadingState />
  return (
    <div className="dashboard-page">
      <Header
        eyebrow="Panel de empresa"
        title={`Bienvenido, ${user?.name}`}
        text="Administra tus convocatorias y consulta el talento interesado."
        action={
          <Link
            className="button button-primary"
            to="/empresa/convocatorias/nueva"
          >
            <FilePlus2 /> Nueva convocatoria
          </Link>
        }
      />
      {error ? <QueryError message={error} onRetry={load} /> : null}
      <div className="metric-grid">
        <Card className="metric-card">
          <div className="metric-icon blue">
            <BriefcaseBusiness />
          </div>
          <div>
            <span>Publicadas</span>
            <strong>{items.length}</strong>
            <small>convocatorias en total</small>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-icon green">
            <CheckCircle2 />
          </div>
          <div>
            <span>Abiertas</span>
            <strong>
              {items.filter((item) => item.status === 'open').length}
            </strong>
            <small>recibiendo postulaciones</small>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-icon amber">
            <UsersRound />
          </div>
          <div>
            <span>Postulaciones</span>
            <strong>
              {items.reduce((total, item) => total + item.applications, 0)}
            </strong>
            <small>recibidas en total</small>
          </div>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <Title as="h2">Convocatorias recientes</Title>
            <p>Estado y respuesta de tus publicaciones.</p>
          </div>
          {items.length ? (
            <Link className="text-link" to="/empresa/convocatorias">
              Administrar todas
            </Link>
          ) : null}
        </div>
        {items.length ? (
          <div className="list-stack">
            {items.map((item) => (
              <div className="company-job-row" key={item.id}>
                <div className="metric-icon blue">
                  <BriefcaseBusiness />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.status === 'draft'
                      ? 'Borrador sin publicar'
                      : `${item.slots} cupos · Cierra ${formatCalendarDate(item.closingDate)}`}
                  </span>
                </div>
                <Badge
                  tone={
                    item.status === 'open'
                      ? 'success'
                      : item.status === 'draft'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {item.status === 'open'
                    ? 'Abierta'
                    : item.status === 'draft'
                      ? 'Borrador'
                      : 'Cerrada'}
                </Badge>
                <span className="candidate-count">
                  <UsersRound /> {item.applications}
                </span>
                {item.status !== 'draft' ? (
                  <Link
                    className="text-link"
                    to={`/empresa/convocatorias/${item.id}/candidatos`}
                  >
                    Ver candidatos
                  </Link>
                ) : (
                  <Link
                    className="text-link"
                    to={`/empresa/convocatorias/${item.id}/editar`}
                  >
                    Completar
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="Aún no tienes convocatorias"
            text="Crea una convocatoria o guarda un borrador para comenzar."
            action={
              <Link
                className="button button-primary"
                to="/empresa/convocatorias/nueva"
              >
                Crear convocatoria
              </Link>
            }
          />
        )}
      </Card>
    </div>
  )
}

export function ManageOpportunities() {
  const { user } = useAuth()
  const [items, setItems] = useState<Opportunity[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [queryError, setQueryError] = useState('')
  const [closing, setClosing] = useState<Opportunity | null>(null)
  const [reactivating, setReactivating] = useState<Opportunity | null>(null)
  const [operationError, setOperationError] = useState('')
  const [operationBusy, setOperationBusy] = useState(false)
  const load = async () => {
    setLoading(true)
    setQueryError('')
    try {
      const data = await api.listOpportunities(true)
      setItems(data.filter((item) => item.companyId === user?.id))
    } catch (err) {
      setQueryError(
        getErrorMessage(err, 'No pudimos cargar tus convocatorias.'),
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [user])
  const close = async () => {
    if (!closing || !user || operationBusy) return
    setOperationError('')
    setOperationBusy(true)
    try {
      await api.closeOpportunity(closing.id, user.id)
      setClosing(null)
      await load()
    } catch (err) {
      setOperationError(
        getErrorMessage(err, 'No pudimos cerrar la convocatoria.'),
      )
    } finally {
      setOperationBusy(false)
    }
  }
  const reactivate = async () => {
    if (!reactivating || !user || operationBusy) return
    setOperationError('')
    setOperationBusy(true)
    try {
      await api.reactivateOpportunity(reactivating.id, user.id)
      setReactivating(null)
      await load()
    } catch (err) {
      setOperationError(
        getErrorMessage(err, 'No pudimos reactivar la convocatoria.'),
      )
    } finally {
      setOperationBusy(false)
    }
  }
  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) &&
      (!status || item.status === status),
  )
  const clearFilters = () => {
    setQuery('')
    setStatus('')
  }
  return (
    <div className="dashboard-page">
      <Header
        eyebrow="Administración"
        title="Mis convocatorias"
        text="Consulta, edita, cierra o reactiva las vacantes publicadas por tu empresa."
        action={
          <Link
            className="button button-primary"
            to="/empresa/convocatorias/nueva"
          >
            <FilePlus2 /> Nueva convocatoria
          </Link>
        }
      />
      {operationError && !closing && !reactivating ? (
        <div className="notice warning">{operationError}</div>
      ) : null}
      <Card className="filter-bar">
        <Field label="Buscar">
          <div className="input-with-icon">
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Título de la convocatoria"
            />
          </div>
        </Field>
        <Field label="Estado">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="open">Abiertas</option>
            <option value="draft">Borradores</option>
            <option value="closed">Cerradas</option>
          </Select>
        </Field>
      </Card>
      {loading && !items.length ? (
        <LoadingState />
      ) : queryError ? (
        <QueryError message={queryError} onRetry={() => void load()} />
      ) : !items.length ? (
        <EmptyState
          icon={<BriefcaseBusiness />}
          title="Aún no tienes convocatorias"
          text="Crea tu primera convocatoria para comenzar a recibir postulaciones."
          action={
            <Link
              className="button button-primary"
              to="/empresa/convocatorias/nueva"
            >
              Crear convocatoria
            </Link>
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Search />}
          title="No encontramos coincidencias"
          text="Existen convocatorias, pero ninguna coincide con los filtros."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <Card className="table-card">
          <div className="data-table company-table">
            <div className="table-row table-head">
              <span>Convocatoria</span>
              <span>Cupos</span>
              <span>Estado</span>
              <span>Postulaciones</span>
              <span>Acciones</span>
            </div>
            {filtered.map((item) => (
              <div className="table-row" key={item.id}>
                <div className="table-primary">
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.status === 'draft'
                        ? 'Sin publicar'
                        : `Cierra ${formatCalendarDate(item.closingDate)}`}
                    </small>
                  </span>
                </div>
                <span data-label="Cupos">{item.slots}</span>
                <span data-label="Estado">
                  <Badge
                    tone={
                      item.status === 'open'
                        ? 'success'
                        : item.status === 'draft'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {item.status === 'open'
                      ? 'Abierta'
                      : item.status === 'draft'
                        ? 'Borrador'
                        : 'Cerrada'}
                  </Badge>
                </span>
                <span data-label="Postulaciones">{item.applications}</span>
                <div className="row-actions">
                  {item.status !== 'draft' ? (
                    <Link
                      className="icon-button"
                      aria-label="Ver candidatos"
                      to={`/empresa/convocatorias/${item.id}/candidatos`}
                    >
                      <UsersRound />
                    </Link>
                  ) : null}
                  <Link
                    className="icon-button"
                    aria-label="Editar"
                    to={`/empresa/convocatorias/${item.id}/editar`}
                  >
                    <Edit3 />
                  </Link>
                  {item.status === 'open' ? (
                    <Button
                      variant="ghost"
                      aria-label="Cerrar convocatoria"
                      title="Cerrar convocatoria"
                      onClick={() => {
                        setOperationError('')
                        setClosing(item)
                      }}
                    >
                      <XCircle />
                    </Button>
                  ) : item.status === 'closed' ? (
                    <Button
                      variant="ghost"
                      aria-label="Reactivar convocatoria"
                      title="Reactivar convocatoria"
                      onClick={() => {
                        setOperationError('')
                        setReactivating(item)
                      }}
                    >
                      <RefreshCw />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Modal
        open={!!closing}
        title="Cerrar convocatoria"
        busy={operationBusy}
        onClose={() => setClosing(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={operationBusy}
              onClick={() => setClosing(null)}
            >
              Cancelar
            </Button>
            <Button variant="danger" loading={operationBusy} onClick={close}>
              Sí, cerrar convocatoria
            </Button>
          </>
        }
      >
        <p>
          La convocatoria <strong>{closing?.title}</strong> dejará de recibir
          postulaciones.
        </p>
        {operationError ? (
          <div className="notice warning">{operationError}</div>
        ) : null}
      </Modal>
      <Modal
        open={!!reactivating}
        title="Reactivar convocatoria"
        busy={operationBusy}
        onClose={() => setReactivating(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={operationBusy}
              onClick={() => setReactivating(null)}
            >
              Cancelar
            </Button>
            <Button loading={operationBusy} onClick={reactivate}>
              Sí, reactivar convocatoria
            </Button>
          </>
        }
      >
        <p>
          La convocatoria <strong>{reactivating?.title}</strong> volverá a
          aceptar postulaciones si su fecha de cierre es válida.
        </p>
        {operationError ? (
          <div className="notice warning">{operationError}</div>
        ) : null}
      </Modal>
    </div>
  )
}

export function OpportunityForm() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [careers, setCareers] = useState<CareerDto[]>([])
  const [originalStatus, setOriginalStatus] =
    useState<Opportunity['status']>('draft')
  const [form, setForm] = useState({
    title: '',
    description: '',
    area: '',
    slots: '1',
    contactName: '',
    contactEmail: user?.contact || user?.email || '',
    contactPhone: user?.phone || '',
    careerIds: [] as string[],
    careerRecordIds: [] as string[],
    closingDate: '',
  })
  const [loading, setLoading] = useState(!!id)
  const [loadError, setLoadError] = useState('')
  const [careersError, setCareersError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const loadCareers = () => {
    setCareersError('')
    api
      .getCareerOptions()
      .then((active) =>
        setCareers((current) => [
          ...active,
          ...current.filter(
            (item) => !active.some((career) => career.id === item.id),
          ),
        ]),
      )
      .catch((err) =>
        setCareersError(
          getErrorMessage(err, 'No pudimos cargar el catálogo de carreras.'),
        ),
      )
  }
  const loadOpportunity = () => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    api
      .getOpportunity(id, user)
      .then((item) => {
        if (item.companyId !== user?.id)
          throw new Error('No tienes permiso para editar esta convocatoria.')
        setOriginalStatus(item.status)
        setCareers((current) => [
          ...current,
          ...(item.careerAssociations || []).filter(
            (career) => !current.some((active) => active.id === career.id),
          ),
        ])
        setForm({
          title: item.title,
          description: item.description,
          area: item.area,
          slots: String(item.slots),
          contactName: item.contactName,
          contactEmail: item.contactEmail,
          contactPhone: item.contactPhone || '',
          careerIds: item.careerIds,
          careerRecordIds:
            item.careerAssociations?.map((career) => career.id) || [],
          closingDate: item.closingDate || '',
        })
      })
      .catch((err) =>
        setLoadError(
          getErrorMessage(err, 'No pudimos cargar la convocatoria.'),
        ),
      )
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    loadCareers()
    loadOpportunity()
  }, [id, user])
  const set = (key: string, value: string | string[]) =>
    setForm((current) => ({ ...current, [key]: value }))
  const toggleCareer = (career: CareerDto) =>
    set(
      'careerRecordIds',
      form.careerRecordIds.includes(career.id)
        ? form.careerRecordIds.filter((id) => id !== career.id)
        : [...form.careerRecordIds, career.id],
    )
  const save = async (intent: 'draft' | 'publish' | 'save') => {
    if (!user || saving) return
    setError('')
    setSaving(true)
    try {
      await api.saveOpportunity(
        {
          ...form,
          id,
          slots: Number(form.slots),
          closingDate: form.closingDate,
        },
        user,
        intent,
      )
      navigate('/empresa/convocatorias')
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No pudimos guardar los cambios. Tus datos siguen en el formulario.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save(originalStatus === 'draft' ? 'publish' : 'save')
  }
  if (loading) return <LoadingState />
  if (loadError)
    return (
      <div className="dashboard-page">
        <QueryError message={loadError} onRetry={loadOpportunity} />
      </div>
    )
  return (
    <div className="dashboard-page">
      <Header
        eyebrow="Convocatorias"
        title={id ? 'Editar convocatoria' : 'Nueva convocatoria'}
        text="Guarda un borrador o completa la información para publicar la oportunidad."
      />
      {careersError ? (
        <div className="notice warning inline-retry">
          <span>{careersError}</span>
          <Button type="button" variant="secondary" onClick={loadCareers}>
            Reintentar
          </Button>
        </div>
      ) : null}
      <form onSubmit={submit}>
        <Card className="form-card opportunity-form-card">
          <Title as="h2">Información de la vacante</Title>
          <div className="form-grid">
            <Field label="Título de la convocatoria">
              <Input
                value={form.title}
                onChange={(event) => set('title', event.target.value)}
                placeholder="Ej. Practicante de Desarrollo Frontend"
                required
              />
            </Field>
            <Field label="Área profesional">
              <Input
                value={form.area}
                onChange={(event) => set('area', event.target.value)}
                placeholder="Ej. Tecnologías de la información"
              />
            </Field>
            <Field label="Descripción de la vacante">
              <Textarea
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                rows={7}
              />
            </Field>
            <Field label="Número de cupos">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.slots}
                onChange={(event) => set('slots', event.target.value)}
              />
            </Field>
            <Field label="Nombre del contacto">
              <Input
                value={form.contactName}
                onChange={(event) => set('contactName', event.target.value)}
              />
            </Field>
            <Field label="Correo del contacto">
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(event) => set('contactEmail', event.target.value)}
              />
            </Field>
            <Field label="Teléfono del contacto (opcional)">
              <Input
                value={form.contactPhone}
                onChange={(event) => set('contactPhone', event.target.value)}
              />
            </Field>
            <Field label="Fecha de cierre">
              <Input
                type="date"
                min={mazatlanToday()}
                value={form.closingDate}
                onChange={(event) => set('closingDate', event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Carreras a las que se dirige">
              <div className="career-picker">
                {careers.map((career) => (
                  <label
                    className={
                      form.careerRecordIds.includes(career.id)
                        ? 'career-option selected'
                        : 'career-option'
                    }
                    key={career.id}
                  >
                    <Input
                      type="checkbox"
                      checked={form.careerRecordIds.includes(career.id)}
                      onChange={() => toggleCareer(career)}
                    />
                    <span>
                      {career.name}
                      {career.active ? '' : ' (Inactiva)'}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
          {error ? <div className="notice warning">{error}</div> : null}
          <div className="form-actions">
            <Link
              className="button button-secondary"
              to="/empresa/convocatorias"
            >
              Cancelar
            </Link>
            {!id || originalStatus === 'draft' ? (
              <Button
                type="button"
                variant="secondary"
                loading={saving}
                onClick={() => void save('draft')}
              >
                Guardar borrador
              </Button>
            ) : null}
            <Button type="submit" loading={saving}>
              {originalStatus === 'draft'
                ? 'Publicar convocatoria'
                : 'Guardar cambios'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}

export function CandidatesPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [item, setItem] = useState<Opportunity | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [loadingItem, setLoadingItem] = useState(true)
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [itemError, setItemError] = useState('')
  const [candidatesError, setCandidatesError] = useState('')
  const loadItem = () => {
    setLoadingItem(true)
    setItemError('')
    api
      .getOpportunity(id, user)
      .then((opportunity) => {
        if (opportunity.companyId !== user?.id)
          throw new Error('No tienes permiso para consultar estos candidatos.')
        setItem(opportunity)
      })
      .catch((err) =>
        setItemError(
          getErrorMessage(err, 'No pudimos cargar la convocatoria.'),
        ),
      )
      .finally(() => setLoadingItem(false))
  }
  const loadCandidates = () => {
    setLoadingCandidates(true)
    setCandidatesError('')
    api
      .candidates(id)
      .then(setCandidates)
      .catch((err) =>
        setCandidatesError(
          getErrorMessage(err, 'No pudimos cargar los candidatos.'),
        ),
      )
      .finally(() => setLoadingCandidates(false))
  }
  useEffect(() => {
    loadItem()
    loadCandidates()
  }, [id, user])
  const saveStatus = async () => {
    if (!selected || !user || savingStatus) return
    setSavingStatus(true)
    setStatusMessage('')
    try {
      await api.updateApplicationStatus(
        id,
        selected.applicationId,
        selected.status,
        user.id,
      )
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.applicationId === selected.applicationId
            ? selected
            : candidate,
        ),
      )
      setSelected(null)
    } catch (err) {
      setStatusMessage(
        getErrorMessage(
          err,
          'No pudimos actualizar el estado. Inténtalo nuevamente.',
        ),
      )
    } finally {
      setSavingStatus(false)
    }
  }
  if ((loadingItem || loadingCandidates) && !item && !candidates.length)
    return <LoadingState />
  if (itemError)
    return (
      <div className="dashboard-page">
        <QueryError message={itemError} onRetry={loadItem} />
      </div>
    )
  if (candidatesError)
    return (
      <div className="dashboard-page">
        <QueryError message={candidatesError} onRetry={loadCandidates} />
      </div>
    )
  return (
    <div className="dashboard-page">
      <Header
        eyebrow="Candidatos"
        title={item?.title || 'Postulaciones'}
        text={`${candidates.length} estudiantes han compartido su perfil para esta convocatoria.`}
        action={
          <Link className="button button-secondary" to="/empresa/convocatorias">
            Volver
          </Link>
        }
      />
      {candidates.length ? (
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <Card className="candidate-card" key={candidate.id}>
              <div className="candidate-head">
                <Avatar src={candidate.photo} initials={candidate.initials} />
                <div>
                  <Title as="h3">{candidate.name}</Title>
                  <p>{candidate.career}</p>
                </div>
                <ApplicationStatusBadge status={candidate.status} />
              </div>
              <div className="candidate-meta">
                <span>
                  <Clock3 />{' '}
                  {new Date(candidate.date).toLocaleDateString('es-MX')}
                </span>
                <span>
                  <UserRound /> Perfil disponible
                </span>
              </div>
              <div className="candidate-actions">
                {candidate.cvUrl && (
                  <a
                    className="button button-secondary"
                    href={candidate.cvUrl}
                    download
                  >
                    <Download /> Descargar CV
                  </a>
                )}
                <Button
                  onClick={() => {
                    setSelected(candidate)
                    setStatusMessage('')
                  }}
                >
                  Ver y administrar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UsersRound />}
          title="Aún no hay candidatos"
          text="Las postulaciones aparecerán aquí cuando los estudiantes compartan su perfil."
        />
      )}
      <Modal
        open={!!selected}
        title="Perfil del candidato"
        busy={savingStatus}
        onClose={() => setSelected(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={savingStatus}
              onClick={() => setSelected(null)}
            >
              Cerrar
            </Button>
            <Button loading={savingStatus} onClick={saveStatus}>
              Guardar estado
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="candidate-profile">
            <div className="candidate-profile-head">
              <Avatar
                size="large"
                src={selected.photo}
                initials={selected.initials}
              />
              <div>
                <Title as="h2">{selected.name}</Title>
                <p>{selected.career}</p>
                <ApplicationStatusBadge status={selected.status} />
              </div>
            </div>
            <div className="profile-contact-grid">
              <span>
                <Mail />{' '}
                <span>
                  <small>Correo institucional</small>
                  <strong>{selected.email}</strong>
                </span>
              </span>
              <span>
                <Phone />{' '}
                <span>
                  <small>Teléfono</small>
                  <strong>{selected.phone || 'No disponible'}</strong>
                </span>
              </span>
            </div>
            <div className="profile-summary">
              <Title as="h3">Acerca del estudiante</Title>
              <p>
                {selected.bio || 'El estudiante no ha añadido una descripción.'}
              </p>
            </div>
            <div className="profile-cv">
              <div>
                <FilePlus2 />
                <span>
                  <strong>{selected.cvName}</strong>
                  <small>Currículum actual del estudiante</small>
                </span>
              </div>
              {selected.cvUrl && (
                <a
                  className="button button-secondary"
                  href={selected.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download /> Ver PDF
                </a>
              )}
            </div>
            <Field label="Estado de la postulación">
              <Select
                value={selected.status}
                onChange={(event) =>
                  setSelected({
                    ...selected,
                    status: event.target.value as ApplicationStatus,
                  })
                }
              >
                <option value="ENVIADA">Enviada</option>
                <option value="EN_REVISION">En revisión</option>
                <option value="ACEPTADA">Aceptada</option>
                <option value="RECHAZADA">Rechazada</option>
              </Select>
            </Field>
            {statusMessage ? (
              <div
                className={`notice ${statusMessage.includes('correctamente') ? 'success' : 'warning'}`}
              >
                {statusMessage}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export function CompanyProfile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState(user!)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }))
  const logo = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2_000_000)
      return setMessage('Selecciona una imagen JPG o PNG menor a 2 MB.')
    const reader = new FileReader()
    reader.onload = () => set('logo', String(reader.result))
    reader.readAsDataURL(file)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage('')
    const formatError = rfcError(form.rfc || '') || phoneError(form.phone || '')
    if (formatError) {
      setSaving(false)
      return setMessage(formatError)
    }
    try {
      const updated = await api.updateProfile(form)
      setUser(updated)
      setMessage('El perfil de la empresa se actualizó correctamente.')
    } catch (err) {
      setMessage(
        getErrorMessage(
          err,
          'No pudimos guardar los cambios. Tus datos siguen en el formulario.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="dashboard-page">
      <Header
        eyebrow="Cuenta empresarial"
        title="Perfil de empresa"
        text="Esta información acompaña tus convocatorias y facilita el contacto."
      />
      <form className="settings-layout" onSubmit={submit}>
        <Card className="photo-card">
          <Avatar
            size="large"
            src={form.logo}
            initials={form.name
              .split(' ')
              .map((word) => word[0])
              .join('')
              .slice(0, 2)}
          />
          <Title as="h3">Logotipo institucional</Title>
          <p>JPG o PNG, máximo 2 MB.</p>
          <Input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="visually-hidden"
            onChange={(event) => logo(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud /> Seleccionar logotipo
          </Button>
        </Card>
        <Card>
          <Title as="h2">Información de la empresa</Title>
          <div className="form-grid">
            <Field label="Nombre o razón social">
              <Input
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                required
              />
            </Field>
            <Field label="RFC">
              <Input
                maxLength={13}
                value={form.rfc || ''}
                onChange={(event) =>
                  set('rfc', event.target.value.toUpperCase())
                }
                required
              />
            </Field>
            <Field label="Correo de contacto">
              <Input
                type="email"
                value={form.contact || ''}
                onChange={(event) => set('contact', event.target.value)}
                required
              />
            </Field>
            <Field label="Teléfono">
              <Input
                type="tel"
                placeholder="10 dígitos, sin espacios ni guiones"
                inputMode="numeric"
                maxLength={10}
                value={form.phone || ''}
                onChange={(event) => set('phone', event.target.value)}
              />
            </Field>
            <Field label="Giro">
              <Input
                value={form.giro || ''}
                onChange={(event) => set('giro', event.target.value)}
                required
              />
            </Field>
            <Field label="Dirección">
              <Input
                value={form.address || ''}
                onChange={(event) => set('address', event.target.value)}
                required
              />
            </Field>
            <Field label="Descripción">
              <Textarea
                value={form.bio || ''}
                onChange={(event) => set('bio', event.target.value)}
              />
            </Field>
            <AgreementSummary dates={agreementDates(form)} />
          </div>
          {message ? (
            <div
              className={`notice ${message.includes('correctamente') ? 'success' : 'warning'}`}
            >
              {message}
            </div>
          ) : null}
          <div className="form-actions">
            <Button type="submit" loading={saving}>
              Guardar cambios
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
