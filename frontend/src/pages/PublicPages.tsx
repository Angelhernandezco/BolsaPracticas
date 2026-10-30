import OpportunityAgreementNotice from '../components/OpportunityAgreementNotice'
import { agreementDates } from '../lib/agreements'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileCheck2,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import OpportunityCard from '../components/OpportunityCard'
import {
  Badge,
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  QueryError,
  Select,
  Title,
} from '../components/ui'
import {
  api,
  ApiError,
  formatCalendarDate,
  getErrorMessage,
  mazatlanToday,
} from '../services/api'
import type { Opportunity } from '../types'
import { useAuth } from '../app/AuthContext'

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <Badge tone="info">
              <Sparkles size={14} /> Tu vínculo con la experiencia profesional
            </Badge>
            <Title>Tu próxima experiencia profesional empieza aquí.</Title>
            <p>
              Una plataforma privada para que estudiantes de universidades
              registradas conecten con empresas y gestionen sus prácticas
              profesionales.
            </p>
            <div className="hero-actions">
              <Link
                className="button button-primary button-large"
                to="/iniciar-sesion"
              >
                Ingresar a la plataforma <ArrowRight size={18} />
              </Link>
              <Link
                className="button button-secondary button-large"
                to="/registro"
              >
                Crear mi perfil
              </Link>
            </div>
            <div className="trust-row">
              <span>
                <CheckCircle2 /> Acceso institucional
              </span>
              <span>
                <CheckCircle2 /> Postulación sencilla
              </span>
              <span>
                <CheckCircle2 /> Prácticas profesionales seguras
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Vista previa de la plataforma"
          >
            <div className="visual-glow" />
            <Card className="feature-window institutional-window">
              <div className="institutional-icon">
                <ShieldCheck />
              </div>
              <span className="eyebrow">Acceso institucional</span>
              <Title as="h2">
                Un espacio privado para tu comunidad universitaria
              </Title>
              <p>
                Las convocatorias están disponibles únicamente para estudiantes
                autenticados con un correo institucional autorizado.
              </p>
              <div className="profile-progress">
                <div>
                  <span>Identidad académica</span>
                  <strong>Acceso protegido</strong>
                </div>
                <div className="progress-track">
                  <span className="full" />
                </div>
              </div>
            </Card>
            <Card className="floating-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Correo verificado</strong>
                <span>Universidad registrada</span>
              </div>
              <CheckCircle2 className="success-icon" />
            </Card>
          </div>
        </div>
      </section>
      <section className="section section-tint">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">Una plataforma, dos caminos</span>
            <Title as="h2">Todo lo necesario para dar el siguiente paso</Title>
            <p>
              Herramientas claras para estudiantes y empresas, sin procesos
              innecesarios.
            </p>
          </div>
          <div className="benefit-grid">
            <Card>
              <div className="benefit-icon blue">
                <UserRound />
              </div>
              <Title as="h3">Para estudiantes</Title>
              <p>
                Descubre vacantes, presenta tu perfil y mantén tus postulaciones
                en un solo lugar.
              </p>
              <ul className="check-list">
                <li>
                  <CheckCircle2 /> Perfil y currículum actualizados
                </li>
                <li>
                  <CheckCircle2 /> Búsqueda por área profesional
                </li>
                <li>
                  <CheckCircle2 /> Seguimiento de postulaciones
                </li>
              </ul>
              <Link className="text-link" to="/registro?rol=student">
                Crear perfil de estudiante <ArrowRight />
              </Link>
            </Card>
            <Card>
              <div className="benefit-icon green">
                <Building2 />
              </div>
              <Title as="h3">Para empresas</Title>
              <p>
                Publica convocatorias y encuentra estudiantes con el perfil
                adecuado para tu equipo.
              </p>
              <ul className="check-list">
                <li>
                  <CheckCircle2 /> Gestión de convocatorias
                </li>
                <li>
                  <CheckCircle2 /> Candidatos organizados
                </li>
                <li>
                  <CheckCircle2 /> Acceso autorizado a CV
                </li>
              </ul>
              <Link className="text-link" to="/registro?rol=company">
                Registrar mi empresa <ArrowRight />
              </Link>
            </Card>
          </div>
        </div>
      </section>
      <section className="section cta-section">
        <div className="container cta-box">
          <div>
            <Title as="h2">
              Haz que tu talento encuentre el lugar correcto.
            </Title>
            <p>
              Crea tu cuenta y comienza a construir tu experiencia profesional.
            </p>
          </div>
          <Link className="button button-light button-large" to="/registro">
            Comenzar ahora <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  )
}

export function CatalogPage() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  useEffect(() => {
    api
      .listOpportunities()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])
  const areas = [...new Set(items.map((item) => item.area))]
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          `${item.title} ${item.company} ${item.description}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!area || item.area === area),
      ),
    [items, query, area],
  )
  return (
    <section className="section page-section">
      <div className="container">
        <div className="page-intro">
          <span className="eyebrow">Catálogo de convocatorias</span>
          <Title>Encuentra una oportunidad para crecer</Title>
          <p>
            Explora prácticas profesionales activas y filtra por el área que te
            interesa.
          </p>
        </div>
        <Card className="filter-bar">
          <Field label="Buscar convocatorias">
            <div className="input-with-icon">
              <Search />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título, empresa o palabra clave"
              />
            </div>
          </Field>
          <Field label="Área profesional">
            <Select
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              <option value="">Todas las áreas</option>
              {areas.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </Card>
        <div className="results-head">
          <strong>{filtered.length} convocatorias activas</strong>
          <span>Ordenadas por fecha de publicación</span>
        </div>
        {loading ? (
          <LoadingState />
        ) : filtered.length ? (
          <div className="cards-grid">
            {filtered.map((item) => (
              <OpportunityCard key={item.id} opportunity={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search />}
            title="No encontramos resultados"
            text="Prueba con otra búsqueda o elimina los filtros seleccionados."
            action={
              <Button
                onClick={() => {
                  setQuery('')
                  setArea('')
                }}
              >
                Limpiar filtros
              </Button>
            }
          />
        )}
      </div>
    </section>
  )
}

export function OpportunityDetailPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [item, setItem] = useState<Opportunity | null>(null)
  const [applied, setApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [applying, setApplying] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [applicationsLoadError, setApplicationsLoadError] = useState('')
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [retry, setRetry] = useState(0)
  const [applicationsRetry, setApplicationsRetry] = useState(0)
  useEffect(() => {
    setLoading(true)
    setLoadError('')
    setNotFound(false)
    api
      .getOpportunity(id, user)
      .then(setItem)
      .catch((error) => {
        if (error instanceof ApiError && error.kind === 'not_found')
          setNotFound(true)
        else
          setLoadError(
            getErrorMessage(error, 'No pudimos cargar la convocatoria.'),
          )
      })
      .finally(() => setLoading(false))
  }, [id, user, retry])
  useEffect(() => {
    if (user?.role !== 'student') return
    setApplicationsLoading(true)
    setApplicationsLoadError('')
    api
      .getApplications(user.id)
      .then((apps) => setApplied(apps.some((app) => app.opportunityId === id)))
      .catch((error) =>
        setApplicationsLoadError(
          getErrorMessage(
            error,
            'No pudimos consultar el estado de tu postulación.',
          ),
        ),
      )
      .finally(() => setApplicationsLoading(false))
  }, [id, user, applicationsRetry])
  const apply = async () => {
    if (!user || !item || applying) return
    if (!user.cvName || !user.career) {
      setMessage(
        'Completa tu perfil y carga tu currículum antes de postularte.',
      )
      return
    }
    setApplying(true)
    setMessage('')
    try {
      await api.apply(item.id, user.id)
      setApplied(true)
      setMessage('Tu postulación quedó registrada correctamente.')
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          'No pudimos enviar tu postulación. Inténtalo nuevamente.',
        ),
      )
    } finally {
      setApplying(false)
    }
  }
  if (loading) return <LoadingState />
  if (loadError)
    return (
      <section className="section">
        <QueryError
          message={loadError}
          onRetry={() => setRetry((value) => value + 1)}
        />
      </section>
    )
  if (!item || notFound)
    return (
      <section className="section">
        <EmptyState
          icon={<BriefcaseBusiness />}
          title="Convocatoria no disponible"
          text="La convocatoria ya no está disponible, pero tu historial de postulación conserva su información."
        />
      </section>
    )
  if (applicationsLoadError)
    return (
      <section className="section">
        <QueryError
          message={applicationsLoadError}
          onRetry={() => setApplicationsRetry((value) => value + 1)}
        />
      </section>
    )
  const available =
    item.status === 'open' &&
    item.slots > 0 &&
    item.closingDate >= mazatlanToday()
  const fromApplications = searchParams.get('from') === 'postulaciones'
  return (
    <section className="section page-section">
      <div className="container detail-layout">
        <div>
          <Link
            className="back-link"
            to={
              fromApplications
                ? '/estudiante/postulaciones'
                : '/estudiante/convocatorias'
            }
          >
            ←{' '}
            {fromApplications
              ? 'Volver a postulaciones'
              : 'Volver a convocatorias'}
          </Link>
          <Card className="detail-main">
            <div className="detail-company">
              <Avatar
                size="company"
                src={item.companyLogo}
                initials={item.initials}
              />
              <div>
                <Badge tone={available ? 'success' : 'neutral'}>
                  {available ? 'Convocatoria abierta' : 'Convocatoria cerrada'}
                </Badge>
                <Title>{item.title}</Title>
                <p className="lead">{item.company}</p>
              </div>
            </div>
            <div className="detail-stats">
              <div>
                <UsersRound />
                <span>Cupos disponibles</span>
                <strong>{item.slots}</strong>
              </div>
              <div>
                <BriefcaseBusiness />
                <span>Área profesional</span>
                <strong>{item.area}</strong>
              </div>
              <div>
                <FileCheck2 />
                <span>Fecha de cierre</span>
                <strong>{formatCalendarDate(item.closingDate)}</strong>
              </div>
            </div>
            <div className="rich-content">
              <Title as="h2">Descripción de la oportunidad</Title>
              <p>{item.description}</p>
              <Title as="h2">Carreras a las que se dirige</Title>
              <div className="tag-list">
                {item.careerIds.map((career) => (
                  <Badge key={career} tone="info">
                    {career}
                  </Badge>
                ))}
              </div>
              <Title as="h2">Datos de contacto</Title>
              <p>
                <strong>{item.contactName}</strong>
                <br />
                {item.contactEmail}
                {item.contactPhone ? (
                  <>
                    <br />
                    {item.contactPhone}
                  </>
                ) : null}
              </p>
            </div>
          </Card>
        </div>
        <aside>
          <Card className="apply-card">
            <Title as="h3">¿Te interesa esta oportunidad?</Title>
            {applied ? (
              <div className="notice success">
                <CheckCircle2 />
                <div>
                  <strong>Postulación registrada</strong>
                  <span>La empresa ya puede consultar tu perfil.</span>
                </div>
              </div>
            ) : (
              <>
                <p>Compartiremos tu perfil y currículum con {item.company}.</p>
                <Button
                  disabled={!available || applicationsLoading}
                  loading={applying || applicationsLoading}
                  onClick={apply}
                >
                  Postularme ahora <ArrowRight />
                </Button>
              </>
            )}
            {!available ? (
              <p className="field-error">
                Esta convocatoria está cerrada o su fecha límite ya venció.
              </p>
            ) : null}
            {message ? (
              <div className={`notice ${applied ? 'success' : 'warning'}`}>
                {message}
              </div>
            ) : null}
            <div className="safe-note">
              <ShieldCheck />
              <span>
                Tu información se comparte únicamente al postularte. Las
                carreras son orientativas y no restringen la postulación.
              </span>
            </div>
            <OpportunityAgreementNotice dates={agreementDates(item)} />
          </Card>
        </aside>
      </div>
    </section>
  )
}

export function HowItWorksPage() {
  return (
    <section className="section page-section">
      <div className="container narrow">
        <div className="page-intro centered">
          <span className="eyebrow">Proceso claro y seguro</span>
          <Title>Cómo funciona Bolsa Prácticas</Title>
          <p>
            Cada rol cuenta con herramientas específicas y acceso únicamente a
            su propia información.
          </p>
        </div>
        <Card className="institutional-notice">
          <ShieldCheck />
          <div>
            <Title as="h3">Acceso exclusivo con correo institucional</Title>
            <p>
              Para registrarse como estudiante es obligatorio utilizar el correo
              institucional de la Universidad Autónoma de Sinaloa. Los dominios
              autorizados son{' '}
              <strong>@uas.edu, @uas.edu.mx y @ms.uas.edu.mx</strong>. Después
              del registro también se verifica la propiedad del correo.
            </p>
          </div>
        </Card>
        <div className="steps-grid">
          <Card>
            <span className="step-number">01</span>
            <Title as="h3">Crea y verifica tu cuenta</Title>
            <p>
              Regístrate con un correo institucional oficial de la Universidad
              Autónoma de Sinaloa y utiliza el enlace de verificación.
            </p>
          </Card>
          <Card>
            <span className="step-number">02</span>
            <Title as="h3">Prepara la información</Title>
            <p>
              Los estudiantes suben su CV; las empresas verifican su correo y
              esperan aprobación administrativa.
            </p>
          </Card>
          <Card>
            <span className="step-number">03</span>
            <Title as="h3">Conecta</Title>
            <p>
              Los estudiantes consultan convocatorias abiertas y las empresas
              aprobadas revisan únicamente sus candidatos.
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}
