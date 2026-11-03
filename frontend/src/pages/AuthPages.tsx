import { AgreementSummary } from '../components/AgreementBadge'
import { agreementDates } from '../lib/agreements'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  matriculaError,
  phoneError,
  rfcError,
} from '../lib/registration-validation'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import Logo from '../components/Logo'
import {
  Badge,
  Button,
  Card,
  ControlButton,
  Field,
  Input,
  LoadingState,
  Select,
  Title,
} from '../components/ui'
import { api, getErrorMessage } from '../services/api'
import type { RegistrationInput, Role, VerificationResult } from '../types'
import { useAuth } from '../app/AuthContext'

export function destinationFor(user: {
  role: Role
  emailVerified: boolean
  approvalStatus?: string
}) {
  if (!user.emailVerified) return '/verificar-correo'
  if (user.role === 'company' && user.approvalStatus !== 'approved')
    return '/estado-solicitud'
  if (user.role === 'student') return '/estudiante'
  if (user.role === 'company') return '/empresa'
  return '/admin'
}

export function LoginPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('mariana.lopez@uas.edu')
  const [password, setPassword] = useState('Demo1234')
  const [error, setError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(() =>
    api.consumeSessionExpiredNotice(),
  )
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to={destinationFor(user)} replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.includes('@') || password.length < 8)
      return setError(
        'Ingresa un correo válido y una contraseña de al menos 8 caracteres.',
      )
    setLoading(true)
    try {
      const current = await api.login(email, password)
      setSessionExpired(false)
      setUser(current)
      navigate(destinationFor(current))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No fue posible iniciar sesión.',
      )
    } finally {
      setLoading(false)
    }
  }
  const demo = (value: string) => {
    setEmail(value)
    setPassword('Demo1234')
  }
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Link to="/" className="back-link">
          <ArrowLeft /> Volver al inicio
        </Link>
        <div className="auth-brand-content">
          <Logo />
          <Title>
            Tu experiencia profesional comienza con una oportunidad.
          </Title>
          <p>
            Accede con una cuenta autorizada para gestionar prácticas,
            convocatorias o solicitudes.
          </p>
          <ul className="check-list inverse">
            <li>
              <CheckCircle2 /> Acceso institucional para estudiantes
            </li>
            <li>
              <CheckCircle2 /> Empresas aprobadas por administradores
            </li>
            <li>
              <CheckCircle2 /> Información protegida
            </li>
          </ul>
        </div>
      </div>
      <main className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Bienvenido de nuevo</span>
            <Title>Inicia sesión</Title>
            <p>Ingresa tu correo y contraseña para continuar.</p>
          </div>
          <Field label="Correo electrónico">
            <div className="input-with-icon">
              <Mail />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
          </Field>
          <Field label="Contraseña">
            <div className="input-with-icon">
              <LockKeyhole />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
          </Field>
          {sessionExpired ? (
            <div className="notice warning">
              Tu sesión expiró. Inicia sesión nuevamente para continuar.
            </div>
          ) : null}
          {error ? <div className="notice warning">{error}</div> : null}
          <Button type="submit" loading={loading}>
            Iniciar sesión
          </Button>
          <div className="demo-accounts">
            <strong>Cuentas de demostración · contraseña Demo1234</strong>
            <ControlButton
              type="button"
              onClick={() => demo('mariana.lopez@uas.edu')}
            >
              Estudiante verificado
            </ControlButton>
            <ControlButton
              type="button"
              onClick={() => demo('diego.ramirez@uas.edu')}
            >
              Estudiante sin verificar
            </ControlButton>
            <ControlButton
              type="button"
              onClick={() => demo('empresa.sinverificar@demo.mx')}
            >
              Empresa sin verificar
            </ControlButton>
            <ControlButton
              type="button"
              onClick={() => demo('pendiente@demo.mx')}
            >
              Empresa pendiente
            </ControlButton>
            <ControlButton
              type="button"
              onClick={() => demo('empresa@demo.mx')}
            >
              Empresa aprobada
            </ControlButton>
            <ControlButton
              type="button"
              onClick={() => demo('rechazada@demo.mx')}
            >
              Empresa rechazada
            </ControlButton>
            <ControlButton type="button" onClick={() => demo('admin@demo.mx')}>
              Administrador
            </ControlButton>
          </div>
          <p className="auth-switch">
            ¿Aún no tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
          </p>
        </form>
      </main>
    </div>
  )
}

export function RegisterPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState<'student' | 'company'>(
    params.get('rol') === 'company' ? 'company' : 'student',
  )
  const [careers, setCareers] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    matricula: '',
    career: '',
    rfc: '',
    giro: '',
    address: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    void api.getCareers().then(setCareers)
  }, [])
  if (user) return <Navigate to={destinationFor(user)} replace />
  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const email = form.email.trim().toLowerCase()
    if (!form.name.trim() || !email || form.password.length < 8)
      return setError(
        'Completa los campos obligatorios y usa una contraseña de al menos 8 caracteres.',
      )
    if (role === 'student' && !api.isUasEmail(email))
      return setError(
        'El correo institucional debe terminar en @uas.edu, @uas.edu.mx o @ms.uas.edu.mx.',
      )
    if (role === 'student' && (!form.matricula.trim() || !form.career))
      return setError('Matrícula y carrera son obligatorias.')
    if (form.password !== form.confirm)
      return setError('Las contraseñas no coinciden.')
    const formatError =
      phoneError(form.phone) ||
      (role === 'student' ? matriculaError(form.matricula) : rfcError(form.rfc))
    if (formatError) return setError(formatError)
    setLoading(true)
    try {
      const input: RegistrationInput = { ...form, email, role }
      const current = await api.register(input)
      setUser(current)
      navigate('/verificar-correo')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No fue posible crear la cuenta.',
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="register-page">
      <header className="register-head">
        <Logo />
        <span>
          ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
        </span>
      </header>
      <main className="register-main">
        <div className="register-intro">
          <span className="eyebrow">Únete a Bolsa Prácticas</span>
          <Title>Crea una cuenta</Title>
          <p>
            Selecciona el perfil que mejor te representa. El rol no podrá
            modificarse desde el perfil.
          </p>
        </div>
        <form className="register-form" onSubmit={submit}>
          <div className="role-picker">
            <ControlButton
              type="button"
              className={role === 'student' ? 'role-card active' : 'role-card'}
              onClick={() => setRole('student')}
            >
              <GraduationCap />
              <span>
                <strong>Soy estudiante</strong>
                <small>Quiero encontrar prácticas profesionales</small>
              </span>
              {role === 'student' ? <CheckCircle2 /> : null}
            </ControlButton>
            <ControlButton
              type="button"
              className={role === 'company' ? 'role-card active' : 'role-card'}
              onClick={() => setRole('company')}
            >
              <Building2 />
              <span>
                <strong>Soy empresa</strong>
                <small>Quiero publicar convocatorias</small>
              </span>
              {role === 'company' ? <CheckCircle2 /> : null}
            </ControlButton>
          </div>
          {role === 'student' ? (
            <div className="institutional-inline">
              <ShieldCheck />
              <span>
                Universidad Autónoma de Sinaloa · Usa un correo que termine
                exactamente en{' '}
                <strong>@uas.edu, @uas.edu.mx o @ms.uas.edu.mx</strong>.
              </span>
            </div>
          ) : (
            <div className="institutional-inline">
              <Clock3 />
              <span>
                La empresa deberá verificar su correo y ser aprobada por un
                administrador antes de acceder al panel.
              </span>
            </div>
          )}
          <div className="form-grid">
            <Field
              label={
                role === 'student' ? 'Nombre completo' : 'Nombre o razón social'
              }
            >
              <Input
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                required
              />
            </Field>
            <Field
              label={
                role === 'student'
                  ? 'Correo institucional'
                  : 'Correo electrónico'
              }
              hint={
                role === 'student'
                  ? 'Ejemplo: nombre@uas.edu, nombre@uas.edu.mx o nombre@ms.uas.edu.mx'
                  : undefined
              }
            >
              <Input
                type="email"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                required
              />
            </Field>
            {role === 'student' ? (
              <>
                <Field label="Matrícula">
                  <Input
                    inputMode="numeric"
                    maxLength={20}
                    value={form.matricula}
                    onChange={(event) => set('matricula', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Carrera">
                  <Select
                    value={form.career}
                    onChange={(event) => set('career', event.target.value)}
                    required
                  >
                    <option value="">Selecciona una carrera</option>
                    {careers.map((career) => (
                      <option key={career}>{career}</option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <>
                <Field label="RFC">
                  <Input
                    value={form.rfc}
                    onChange={(event) =>
                      set('rfc', event.target.value.toUpperCase())
                    }
                    maxLength={13}
                    required
                  />
                </Field>
                <Field label="Giro">
                  <Input
                    value={form.giro}
                    onChange={(event) => set('giro', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Dirección">
                  <Input
                    value={form.address}
                    onChange={(event) => set('address', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Teléfono">
                  <Input
                    type="tel"
                    placeholder="10 dígitos, sin espacios ni guiones"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Contraseña" hint="Mínimo 8 caracteres.">
              <Input
                type="password"
                value={form.password}
                onChange={(event) => set('password', event.target.value)}
                required
              />
            </Field>
            <Field label="Confirmar contraseña">
              <Input
                type="password"
                value={form.confirm}
                onChange={(event) => set('confirm', event.target.value)}
                required
              />
            </Field>
          </div>
          {error ? <div className="notice warning">{error}</div> : null}
          {role === 'company' ? (
            <div className="terms-note">
              <ShieldCheck />
              <span>
                Tu solicitud será registrada. Deberás verificar tu correo y
                esperar la aprobación administrativa antes de acceder al panel.
              </span>
            </div>
          ) : null}
          <Button type="submit" loading={loading}>
            Crear mi cuenta
          </Button>
        </form>
      </main>
    </div>
  )
}

export function VerifyEmailPage() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [seconds, setSeconds] = useState(
    api.mode === 'api' && user?.verificationEmailSent !== undefined ? 60 : 0,
  )
  const [demoToken, setDemoToken] = useState(user ? `verify-${user.id}` : '')
  const [message, setMessage] = useState(
    user?.verificationEmailSent === false
      ? 'Tu cuenta se creó, pero no pudimos enviar el correo de verificación. Solicita otro enlace para continuar.'
      : '',
  )
  const [sending, setSending] = useState(false)
  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(
      () => setSeconds((value) => value - 1),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [seconds])
  if (!user) return <Navigate to="/iniciar-sesion" replace />
  if (user.emailVerified) return <Navigate to={destinationFor(user)} replace />
  const resend = async () => {
    if (sending || seconds > 0) return
    setMessage('')
    setSending(true)
    try {
      const result = await api.resendVerification()
      setSeconds(result.retryAfter)
      setDemoToken(result.demoToken || '')
      setMessage(
        api.mode === 'demo'
          ? 'Solicitud simulada correctamente. No se envió un correo real.'
          : 'Enviamos un enlace de verificación a tu correo. Revisa también la carpeta de spam.',
      )
    } catch (err) {
      setMessage(
        getErrorMessage(
          err,
          'No pudimos solicitar otro enlace. Inténtalo nuevamente.',
        ),
      )
    } finally {
      setSending(false)
    }
  }
  const exit = async () => {
    await logout()
    navigate('/iniciar-sesion')
  }
  return (
    <div className="status-page">
      <Card className="status-card">
        <div className="status-icon info">
          <Mail />
        </div>
        <span className="eyebrow">Verificación pendiente</span>
        <Title>Verifica tu correo</Title>
        <p>
          Para continuar debes confirmar que tienes acceso a{' '}
          <strong>{user.email}</strong>.
        </p>
        {user.role === 'company' ? (
          <div className="notice info">
            Tu solicitud fue registrada. Verifica tu correo electrónico. Un
            administrador revisará los datos de tu empresa y deberá aprobar tu
            solicitud antes de que puedas acceder al panel empresarial.
          </div>
        ) : null}
        {api.mode === 'demo' ? (
          <div className="demo-verification">
            <Badge tone="info">Demostración</Badge>
            <p>
              La simulación no envía un correo real. Usa este enlace para probar
              la verificación.
            </p>
            <Link
              className="button button-primary"
              to={`/verificar-email?token=${demoToken}`}
            >
              Abrir enlace de demostración
            </Link>
          </div>
        ) : (
          <p>
            Abre el enlace que recibiste por correo. Si no lo encuentras, revisa
            la carpeta de spam o solicita otro enlace.
          </p>
        )}
        {message ? <div className="notice info">{message}</div> : null}
        <Button
          variant="secondary"
          disabled={seconds > 0}
          loading={sending}
          onClick={resend}
        >
          <RefreshCw />{' '}
          {seconds > 0 ? `Reenviar en ${seconds}s` : 'Solicitar otro enlace'}
        </Button>
        <Button variant="ghost" onClick={exit}>
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}

export function VerifyTokenPage() {
  const { setUser } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [result, setResult] = useState<
    VerificationResult | 'loading' | 'error'
  >('loading')
  const [attempt, setAttempt] = useState(0)
  const verification = useRef<{
    token: string
    attempt: number
    promise: ReturnType<typeof api.verifyEmail>
  } | null>(null)
  useEffect(() => {
    let active = true
    setResult('loading')
    // StrictMode replays effects, but a token must only be consumed once per visit.
    // Keep this operation in the component: a later visit must ask the server again.
    if (
      verification.current?.token !== token ||
      verification.current.attempt !== attempt
    ) {
      verification.current = { token, attempt, promise: api.verifyEmail(token) }
    }
    verification.current.promise
      .then((response) => {
        if (!active) return
        setResult(response.result)
        if (response.user) setUser(response.user)
      })
      .catch(() => active && setResult('error'))
    return () => {
      active = false
    }
  }, [token, attempt, setUser])
  if (result === 'loading')
    return (
      <div className="status-page">
        <Card className="status-card">
          <LoadingState />
          <Title as="h2">Verificando enlace…</Title>
        </Card>
      </div>
    )
  const content = {
    success: [
      CheckCircle2,
      'Correo verificado',
      'Tu correo se verificó correctamente. Ya puedes continuar.',
      'success',
    ],
    already_verified: [
      CheckCircle2,
      'Correo ya verificado',
      'Este correo ya había sido verificado.',
      'success',
    ],
    invalid: [
      XCircle,
      'Enlace inválido',
      'El enlace no es válido. Solicita uno nuevo desde tu cuenta.',
      'danger',
    ],
    expired: [
      Clock3,
      'Enlace vencido',
      'El enlace expiró. Solicita uno nuevo para verificar tu correo.',
      'warning',
    ],
    error: [
      XCircle,
      'No pudimos verificar el correo',
      'Ocurrió un error temporal. Puedes volver a intentarlo.',
      'danger',
    ],
  }[result] as [typeof CheckCircle2, string, string, string]
  const [Icon, title, text, tone] = content
  return (
    <div className="status-page">
      <Card className="status-card">
        <div className={`status-icon ${tone}`}>
          <Icon />
        </div>
        <Title>{title}</Title>
        <p>{text}</p>
        {result === 'success' || result === 'already_verified' ? (
          <Link className="button button-primary" to="/acceso">
            Continuar
          </Link>
        ) : (
          <>
            <Button onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </Button>
            <Link className="button button-secondary" to="/verificar-correo">
              Solicitar otro enlace
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}

export function CompanyRequestStatusPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return <Navigate to="/iniciar-sesion" replace />
  if (!user.emailVerified) return <Navigate to="/verificar-correo" replace />
  if (user.role !== 'company')
    return <Navigate to={destinationFor(user)} replace />
  if (user.approvalStatus === 'approved')
    return <Navigate to="/empresa" replace />
  const rejected = user.approvalStatus === 'rejected'
  const exit = async () => {
    await logout()
    navigate('/iniciar-sesion')
  }
  return (
    <div className="status-page">
      <Card className="status-card wide">
        <div className={`status-icon ${rejected ? 'danger' : 'warning'}`}>
          {rejected ? <XCircle /> : <Clock3 />}
        </div>
        <Badge tone={rejected ? 'danger' : 'warning'}>
          {rejected ? 'Solicitud rechazada' : 'Solicitud pendiente'}
        </Badge>
        <Title>
          {rejected
            ? 'No fue posible aprobar tu solicitud'
            : 'Solicitud en revisión'}
        </Title>
        <p>
          {rejected
            ? 'Revisa el motivo indicado por el administrador.'
            : 'Tu correo está verificado. Un administrador debe revisar los datos antes de habilitar el panel empresarial. Todavía no tienes acceso a convocatorias ni candidatos.'}
        </p>
        {rejected ? (
          <div className="notice warning">
            <strong>Motivo:</strong> {user.rejectionReason}
          </div>
        ) : null}
        <div className="review-summary">
          <div>
            <span>Empresa</span>
            <strong>{user.name}</strong>
          </div>
          <div>
            <span>RFC</span>
            <strong>{user.rfc}</strong>
          </div>
          <div>
            <span>Correo verificado</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>Giro</span>
            <strong>{user.giro}</strong>
          </div>
          <div>
            <span>Dirección</span>
            <strong>{user.address}</strong>
          </div>
          <AgreementSummary dates={agreementDates(user)} />
        </div>
        <Button variant="secondary" onClick={exit}>
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
