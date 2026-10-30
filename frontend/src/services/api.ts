import seedManifest from '../../../fixtures/seed-data.json'
import { agreementDates, agreementDateError } from '../lib/agreements'
import type {
  AgreementDates,
  CareerDto,
  Application,
  Candidate,
  CompanyReview,
  Opportunity,
  OpportunityStatus,
  RegistrationInput,
  User,
  VerificationResult,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const USE_DEMO = import.meta.env.VITE_USE_MOCKS === 'true'
const SESSION_KEY = 'bolsa-session-id'
const SESSION_NOTICE_KEY = 'bolsa-session-expired'
const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms))
const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isUasEmail = (email: string) =>
  /^[^\s@]+@(?:uas\.edu(?:\.mx)?|ms\.uas\.edu\.mx)$/i.test(
    normalizeEmail(email),
  )
const isEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))

export type ApiErrorKind =
  'network' | 'validation' | 'forbidden' | 'not_found' | 'session' | 'unknown'

export class ApiError extends Error {
  constructor(
    message: string,
    public kind: ApiErrorKind,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const sessionExpiredListeners = new Set<() => void>()
let sessionExpiryHandled = false
const simulatedFailures = new Map<string, ApiErrorKind>()
const simulatedEmptyResults = new Set<string>()

function messageForKind(
  kind: ApiErrorKind,
  fallback = 'No pudimos completar la operación.',
) {
  if (kind === 'network')
    return 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.'
  if (kind === 'validation')
    return 'Revisa la información ingresada e inténtalo nuevamente.'
  if (kind === 'forbidden')
    return 'No tienes permisos para realizar esta acción.'
  if (kind === 'not_found')
    return 'El recurso solicitado ya no está disponible.'
  if (kind === 'session') return 'Tu sesión expiró.'
  return fallback
}

function maybeFail(operation: string) {
  const kind = simulatedFailures.get(operation)
  if (!kind) return
  simulatedFailures.delete(operation)
  if (kind === 'session') notifySessionExpired()
  throw new ApiError(messageForKind(kind), kind)
}

function consumeEmptyResult(operation: string) {
  if (!simulatedEmptyResults.has(operation)) return false
  simulatedEmptyResults.delete(operation)
  return true
}

function notifySessionExpired() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.setItem(SESSION_NOTICE_KEY, '1')
  if (sessionExpiryHandled) return
  sessionExpiryHandled = true
  sessionExpiredListeners.forEach((listener) => listener())
}

export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError)
    return error.message || messageForKind(error.kind, fallback)
  return error instanceof Error && error.message ? error.message : fallback
}

export function mazatlanToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mazatlan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function calendarDateOffset(days: number) {
  const [year, month, day] = mazatlanToday().split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

export function formatCalendarDate(value: string) {
  if (!value) return 'Sin fecha'
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const CAREERS = seedManifest.careers
  .filter((career) => career.active)
  .map((career) => career.name)
const demoCareers: CareerDto[] = seedManifest.careers.map((career, index) => ({
  id: String(index + 1),
  name: career.name,
  active: career.active,
}))
function demoCareerFields(career: CareerDto) {
  return {
    careerId: career.id,
    career: career.name,
    careerActive: career.active,
  }
}

function selectDemoCareers({
  ids,
  names = [],
  existingIds = [],
}: {
  ids?: string[]
  names?: string[]
  existingIds?: string[]
}): CareerDto[] {
  const selected =
    ids === undefined
      ? names.map((name) => demoCareers.find((career) => career.name === name))
      : [...new Set(ids)].map((id) =>
          demoCareers.find((career) => career.id === id),
        )
  if (
    selected.some(
      (career) =>
        !career || (!career.active && !existingIds.includes(career.id)),
    )
  )
    throw new Error('Selecciona una carrera activa y existente.')
  return selected.map((career) => ({ ...career! }))
}

const users: User[] = seedManifest.users.map((item) => {
  const dates =
    'agreementOffsets' in item && item.agreementOffsets
      ? item.agreementOffsets.map(calendarDateOffset)
      : [null, null]
  const career =
    'career' in item
      ? demoCareers.find((career) => career.name === item.career)
      : undefined
  return {
    ...item,
    ...(career ? demoCareerFields(career) : {}),
    agreementStartDate: dates[0],
    agreementEndDate: dates[1],
  } as User
})
const credentials = new Map(
  seedManifest.users.map((user) => [
    user.email,
    user.passwordKey === 'e2e'
      ? seedManifest.passwords.e2e.plain
      : seedManifest.passwords.demo.plain,
  ]),
)
const verificationCooldowns = new Map<string, number>()

const opportunities: Opportunity[] = seedManifest.opportunities.map((item) => ({
  ...item,
  closingDate: item.closingDate.startsWith('offset:')
    ? calendarDateOffset(Number(item.closingDate.slice(7)))
    : item.closingDate,
})) as Opportunity[]
for (const opportunity of opportunities)
  opportunity.careerRecordIds = selectDemoCareers({
    names: opportunity.careerIds,
  }).map((career) => career.id)
let applications: Application[] = seedManifest.applications.map((item) => ({
  ...item,
})) as Application[]

function effectiveOpportunity(item: Opportunity): Opportunity {
  if (
    item.status === 'open' &&
    item.closingDate &&
    mazatlanToday() > item.closingDate
  )
    item.status = 'closed'
  const company = users.find((user) => user.id === item.companyId)
  const associations = selectDemoCareers({
    ids: item.careerRecordIds,
    names: item.careerIds,
    existingIds:
      item.careerRecordIds ||
      demoCareers
        .filter((career) => item.careerIds.includes(career.name))
        .map((career) => career.id),
  })
  return {
    ...item,
    careerIds: associations.map((career) => career.name),
    careerRecordIds: associations.map((career) => career.id),
    careerAssociations: associations,
    companyLogo: company?.logo,
    ...agreementDates(company || {}),
  }
}

function setSession(user: User | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, user.id)
    sessionExpiryHandled = false
  } else localStorage.removeItem(SESSION_KEY)
}

function currentUser() {
  const id = localStorage.getItem(SESSION_KEY)
  return users.find((user) => user.id === id) || null
}

function updateUser(user: User) {
  const index = users.findIndex((item) => item.id === user.id)
  if (index >= 0) users[index] = user
  return user
}

async function request<T>(
  path: string,
  options?: RequestInit,
  skipSessionExpiry = false,
): Promise<T> {
  let response: Response
  try {
    const headers = new Headers(options?.headers)
    if (!(options?.body instanceof FormData))
      headers.set('Content-Type', 'application/json')
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch {
    throw new ApiError(
      'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.',
      'network',
    )
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (response.status === 401) {
      if (!skipSessionExpiry) notifySessionExpired()
      throw new ApiError(
        payload?.message ||
          (skipSessionExpiry
            ? 'El correo o la contraseña no son correctos.'
            : 'Tu sesión expiró.'),
        'session',
        401,
      )
    }
    if (response.status === 403)
      throw new ApiError(
        payload?.message || 'No tienes permisos para realizar esta acción.',
        'forbidden',
        403,
      )
    if (response.status === 404)
      throw new ApiError(
        payload?.message || 'El recurso solicitado ya no está disponible.',
        'not_found',
        404,
      )
    if ([400, 409, 413, 422, 429].includes(response.status))
      throw new ApiError(
        payload?.message || 'Revisa la información ingresada.',
        'validation',
        response.status,
      )
    throw new ApiError(
      payload?.message || 'No pudimos completar la operación.',
      'unknown',
      response.status,
    )
  }
  return response.json() as Promise<T>
}

function assertPublishable(input: Partial<Opportunity>) {
  if (
    !input.title?.trim() ||
    !input.description?.trim() ||
    !input.area?.trim() ||
    !input.contactName?.trim() ||
    !isEmail(input.contactEmail || '')
  )
    throw new ApiError(
      'Completa todos los campos obligatorios antes de publicar.',
      'validation',
      422,
    )
  if (!Number.isInteger(Number(input.slots)) || Number(input.slots) < 1)
    throw new ApiError(
      'Los cupos deben ser un número entero mayor a cero.',
      'validation',
      422,
    )
  if (!input.careerIds?.length)
    throw new ApiError('Selecciona al menos una carrera.', 'validation', 422)
  if (!input.closingDate || input.closingDate < mazatlanToday())
    throw new ApiError(
      'La fecha de cierre debe ser hoy o una fecha posterior.',
      'validation',
      422,
    )
}

export const api = {
  mode: USE_DEMO ? 'demo' : 'api',
  isUasEmail,
  testing: {
    failNext(operation: string, kind: ApiErrorKind = 'network') {
      simulatedFailures.set(operation, kind)
    },
    emptyNext(
      operation:
        | 'listOpportunities'
        | 'getApplications'
        | 'candidates'
        | 'listCompanies',
    ) {
      simulatedEmptyResults.add(operation)
    },
    expireSession() {
      notifySessionExpired()
    },
  },
  consumeSessionExpiredNotice() {
    const expired = sessionStorage.getItem(SESSION_NOTICE_KEY) === '1'
    sessionStorage.removeItem(SESSION_NOTICE_KEY)
    return expired
  },
  async getSession() {
    if (!USE_DEMO) {
      try {
        const session = await request<User | null>(
          '/auth/session',
          undefined,
          true,
        )
        if (session) setSession(session)
        return session
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          if (localStorage.getItem(SESSION_KEY)) notifySessionExpired()
          return null
        }
        throw error
      }
    }
    await wait(100)
    return currentUser()
  },
  async login(email: string, password: string) {
    if (!USE_DEMO) {
      const user = await request<User>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: normalizeEmail(email), password }),
        },
        true,
      )
      setSession(user)
      return user
    }
    await wait()
    const normalized = normalizeEmail(email)
    const user = users.find((item) => item.email === normalized)
    if (!user || credentials.get(normalized) !== password)
      throw new Error('El correo o la contraseña no son correctos.')
    if (user.role === 'student' && !isUasEmail(user.email))
      throw new Error(
        'El correo institucional debe terminar en @uas.edu, @uas.edu.mx o @ms.uas.edu.mx.',
      )
    setSession(user)
    return user
  },
  async register(input: RegistrationInput) {
    if (!USE_DEMO) {
      const user = await request<User>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify(input) },
        true,
      )
      setSession(user)
      return user
    }
    await wait()
    const email = normalizeEmail(input.email)
    if (users.some((user) => user.email === email))
      throw new Error('Ya existe una cuenta con este correo.')
    if (input.role === 'student' && !isUasEmail(email))
      throw new Error(
        'El correo institucional debe terminar en @uas.edu, @uas.edu.mx o @ms.uas.edu.mx.',
      )
    const career =
      input.role === 'student'
        ? selectDemoCareers({ names: [input.career || ''] })[0]
        : undefined
    if (input.role === 'student' && (!input.matricula?.trim() || !career))
      throw new Error('Ingresa tu matrícula y selecciona una carrera válida.')
    if (
      input.role === 'company' &&
      (!input.rfc || !input.giro || !input.address)
    )
      throw new Error('Completa RFC, giro y dirección.')
    const user: User = {
      id: `${input.role}-${Date.now()}`,
      role: input.role,
      name: input.name.trim(),
      email,
      emailVerified: false,
      registeredAt: new Date().toISOString(),
      ...(input.role === 'student'
        ? {
            matricula: input.matricula!.trim(),
            ...demoCareerFields(career!),
            university: 'Universidad Autónoma de Sinaloa' as const,
          }
        : {
            rfc: input.rfc,
            giro: input.giro,
            address: input.address,
            phone: input.phone,
            agreementStartDate: null,
            agreementEndDate: null,
            approvalStatus: 'pending' as const,
          }),
    }
    users.push(user)
    credentials.set(email, input.password)
    setSession(user)
    return user
  },
  async logout() {
    if (!USE_DEMO) await request('/auth/logout', { method: 'POST' })
    setSession(null)
    sessionStorage.removeItem(SESSION_NOTICE_KEY)
  },
  async resendVerification(): Promise<{
    retryAfter: number
    demoToken?: string
  }> {
    if (!USE_DEMO)
      return request<{ retryAfter: number; demoToken?: string }>(
        '/auth/email/resend',
        { method: 'POST' },
      )
    maybeFail('resendVerification')
    await wait()
    const user = currentUser()
    if (!user) throw new Error('La sesión expiró.')
    const availableAt = verificationCooldowns.get(user.id) || 0
    if (availableAt > Date.now())
      throw new Error(
        `Espera ${Math.ceil((availableAt - Date.now()) / 1000)} segundos antes de solicitar otro enlace.`,
      )
    verificationCooldowns.set(user.id, Date.now() + 30000)
    return { retryAfter: 30, demoToken: `verify-${user.id}` }
  },
  async verifyEmail(
    token: string,
  ): Promise<{ result: VerificationResult; user?: User }> {
    if (!USE_DEMO)
      return request(
        '/auth/email/verify',
        { method: 'POST', body: JSON.stringify({ token }) },
        true,
      )
    maybeFail('verifyEmail')
    await wait(600)
    if (token === 'expired') return { result: 'expired' }
    if (!token.startsWith('verify-')) return { result: 'invalid' }
    const user = users.find((item) => `verify-${item.id}` === token)
    if (!user) return { result: 'invalid' }
    if (user.emailVerified) {
      setSession(user)
      return { result: 'already_verified', user }
    }
    user.emailVerified = true
    setSession(user)
    return { result: 'success', user }
  },
  async getCareerOptions(): Promise<CareerDto[]> {
    if (!USE_DEMO) return request<CareerDto[]>('/catalogs/careers/options')
    return demoCareers
      .filter((career) => career.active)
      .map((career) => ({ ...career }))
  },
  async listCareers(): Promise<CareerDto[]> {
    if (!USE_DEMO) return request<CareerDto[]>('/admin/careers')
    return demoCareers.map((career) => ({ ...career }))
  },
  async createCareer(name: string): Promise<CareerDto> {
    if (!USE_DEMO)
      return request<CareerDto>('/admin/careers', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    if (
      demoCareers.some(
        (career) =>
          career.name.trim().toLowerCase() === name.trim().toLowerCase(),
      )
    )
      throw new Error('Ya existe una carrera con ese nombre.')
    if (!name.trim()) throw new Error('Ingresa el nombre de la carrera.')
    const career = { id: crypto.randomUUID(), name: name.trim(), active: true }
    demoCareers.push(career)
    return career
  },
  async updateCareer(
    id: string,
    changes: Partial<Pick<CareerDto, 'name' | 'active'>>,
  ): Promise<CareerDto> {
    if (!USE_DEMO)
      return request<CareerDto>(`/admin/careers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      })
    const career = demoCareers.find((item) => item.id === id)
    if (!career) throw new Error('La carrera no existe.')
    if (
      changes.name !== undefined &&
      (!changes.name.trim() ||
        demoCareers.some(
          (item) =>
            item.id !== id &&
            item.name.toLowerCase() === changes.name!.trim().toLowerCase(),
        ))
    )
      throw new Error(
        'El nombre de la carrera debe ser único y no estar vacío.',
      )
    Object.assign(
      career,
      changes,
      changes.name !== undefined ? { name: changes.name.trim() } : {},
    )
    for (const user of users.filter((user) => user.careerId === id))
      Object.assign(user, demoCareerFields(career))
    return { ...career }
  },
  async getCareers() {
    if (!USE_DEMO) return request<string[]>('/catalogs/careers')
    maybeFail('getCareers')
    await wait(80)
    return demoCareers
      .filter((career) => career.active)
      .map((career) => career.name)
  },
  async updateProfile(user: User) {
    if (!USE_DEMO) {
      let updated = await request<User>(
        `/${user.role === 'company' ? 'companies' : 'students'}/profile`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: user.name,
            matricula: user.matricula,
            career: user.career,
            careerId: user.careerId,
            phone: user.phone,
            bio: user.bio,
            rfc: user.rfc,
            contact: user.contact,
            giro: user.giro,
            address: user.address,
          }),
        },
      )
      const image = user.role === 'student' ? user.photo : user.logo
      if (image?.startsWith('data:image/')) {
        const blob = await fetch(image).then((response) => response.blob())
        const form = new FormData()
        form.append(
          'file',
          blob,
          blob.type === 'image/png' ? 'imagen.png' : 'imagen.jpg',
        )
        updated = await request<User>('/profiles/image', {
          method: 'POST',
          body: form,
        })
      }
      return updated
    }
    maybeFail('updateProfile')
    await wait()
    if (user.role === 'student') {
      const current = users.find((item) => item.id === user.id)
      const career = selectDemoCareers({
        ids: user.careerId ? [user.careerId] : undefined,
        names: user.career ? [user.career] : [],
        existingIds: current?.careerId ? [current.careerId] : [],
      })[0]
      if (!user.matricula?.trim() || !career)
        throw new Error('Matrícula y carrera son obligatorias.')
      user = { ...user, ...demoCareerFields(career) }
    }
    if (user.role === 'company') {
      const current = users.find(
        (item) => item.id === user.id && item.role === 'company',
      )
      user = { ...user, ...agreementDates(current || {}) }
    }
    return updateUser(user)
  },
  async uploadCV(file: File) {
    if (!USE_DEMO) {
      const form = new FormData()
      form.append('file', file)
      return request<User>('/students/cv', { method: 'POST', body: form })
    }
    const user = currentUser()
    if (!user) throw new Error('Inicia sesión para continuar.')
    return api.updateProfile({
      ...user,
      cvName: file.name,
      cvUrl: URL.createObjectURL(file),
      cvUpdatedAt: new Date().toISOString(),
    })
  },
  async listOpportunities(includeAll = false) {
    if (!USE_DEMO)
      return request<Opportunity[]>(
        `/opportunities${includeAll ? '?all=true' : ''}`,
      )
    maybeFail('listOpportunities')
    await wait()
    if (consumeEmptyResult('listOpportunities')) return []
    return opportunities
      .map(effectiveOpportunity)
      .filter((item) => includeAll || item.status === 'open')
  },
  async getOpportunity(id: string, viewer?: User | null) {
    if (!USE_DEMO) return request<Opportunity>(`/opportunities/${id}`)
    maybeFail('getOpportunity')
    await wait(100)
    const item = opportunities.find((opportunity) => opportunity.id === id)
    if (!item)
      throw new ApiError(
        'La convocatoria ya no está disponible.',
        'not_found',
        404,
      )
    if (
      item.status === 'draft' &&
      (viewer?.role !== 'company' || viewer.id !== item.companyId)
    )
      throw new ApiError(
        'No tienes permisos para consultar esta convocatoria.',
        'forbidden',
        403,
      )
    return effectiveOpportunity(item)
  },
  async saveOpportunity(
    input: Partial<Opportunity>,
    company: User,
    intent: 'draft' | 'publish' | 'save' = 'publish',
  ) {
    if (!USE_DEMO)
      return request<Opportunity>(
        `/company/opportunities${input.id ? `/${input.id}` : ''}`,
        {
          method: input.id ? 'PUT' : 'POST',
          body: JSON.stringify({ ...input, intent }),
        },
      )
    maybeFail('saveOpportunity')
    await wait()
    if (
      company.role !== 'company' ||
      company.approvalStatus !== 'approved' ||
      !company.emailVerified
    )
      throw new Error(
        'La empresa no tiene acceso para administrar convocatorias.',
      )
    if (!input.title?.trim())
      throw new Error(
        'El título es obligatorio incluso para guardar un borrador.',
      )
    const title = input.title.trim()
    const previous = input.id
      ? opportunities.find(
          (item) => item.id === input.id && item.companyId === company.id,
        )
      : undefined
    if (input.id && !previous)
      throw new Error('No tienes permiso para editar esta convocatoria.')
    const associations = selectDemoCareers({
      ids:
        input.careerRecordIds ??
        (input.careerIds === undefined ? previous?.careerRecordIds : undefined),
      names: input.careerIds,
      existingIds: previous?.careerRecordIds || [],
    })
    input = {
      ...input,
      careerIds: associations.map((career) => career.name),
      careerRecordIds: associations.map((career) => career.id),
      careerAssociations: associations,
    }
    if (intent !== 'draft') assertPublishable(input)
    if (input.id) {
      const index = opportunities.findIndex(
        (item) => item.id === input.id && item.companyId === company.id,
      )
      if (index < 0)
        throw new Error('No tienes permiso para editar esta convocatoria.')
      const status: OpportunityStatus =
        intent === 'draft'
          ? 'draft'
          : intent === 'publish'
            ? 'open'
            : opportunities[index].status
      opportunities[index] = {
        ...opportunities[index],
        ...input,
        status,
        publishedAt:
          status === 'open' && !opportunities[index].publishedAt
            ? new Date().toISOString()
            : opportunities[index].publishedAt,
      } as Opportunity
      return effectiveOpportunity(opportunities[index])
    }
    const status: OpportunityStatus = intent === 'draft' ? 'draft' : 'open'
    const item: Opportunity = {
      id: `op-${Date.now()}`,
      companyId: company.id,
      company: company.name,
      title,
      description: input.description || '',
      area: input.area || '',
      slots: Number(input.slots || 0),
      contact: input.contactEmail || '',
      contactName: input.contactName || '',
      contactEmail: input.contactEmail || '',
      contactPhone: input.contactPhone,
      careerIds: input.careerIds || [],
      careerRecordIds: input.careerRecordIds,
      careerAssociations: input.careerAssociations,
      closingDate: input.closingDate || '',
      timezone: 'America/Mazatlan',
      status,
      publishedAt: status === 'open' ? new Date().toISOString() : '',
      applications: 0,
      initials: company.name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2),
    }
    opportunities.unshift(item)
    return effectiveOpportunity(item)
  },
  async closeOpportunity(id: string, companyId: string) {
    if (!USE_DEMO)
      return request<Opportunity>(`/company/opportunities/${id}/close`, {
        method: 'POST',
      })
    maybeFail('closeOpportunity')
    const item = opportunities.find(
      (opportunity) =>
        opportunity.id === id && opportunity.companyId === companyId,
    )
    if (!item)
      throw new Error('No tienes permiso para cerrar esta convocatoria.')
    await wait()
    item.status = 'closed'
    return item
  },
  async reactivateOpportunity(id: string, companyId: string) {
    if (!USE_DEMO)
      return request<Opportunity>(`/company/opportunities/${id}/reactivate`, {
        method: 'POST',
      })
    maybeFail('reactivateOpportunity')
    const item = opportunities.find(
      (opportunity) =>
        opportunity.id === id && opportunity.companyId === companyId,
    )
    if (!item)
      throw new Error('No tienes permiso para reactivar esta convocatoria.')
    if (!item.closingDate || item.closingDate < mazatlanToday())
      throw new Error(
        'Edita la convocatoria y asigna una fecha de cierre igual o posterior a hoy antes de reactivarla.',
      )
    await wait()
    item.status = 'open'
    return item
  },
  async getApplications(studentId: string) {
    if (!USE_DEMO) return request<Application[]>('/applications/me')
    maybeFail('getApplications')
    await wait()
    if (consumeEmptyResult('getApplications')) return []
    return applications
      .filter((item) => item.studentId === studentId)
      .map((application) => {
        const opportunity = opportunities.find(
          (item) => item.id === application.opportunityId,
        )
        return opportunity
          ? {
              ...application,
              opportunityTitle: opportunity.title,
              companyName: opportunity.company,
              companyLogo: users.find(
                (user) => user.id === opportunity.companyId,
              )?.logo,
              opportunityStatus: effectiveOpportunity(opportunity).status,
            }
          : application
      })
  },
  async apply(opportunityId: string, studentId: string) {
    if (!USE_DEMO)
      return request<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify({ opportunityId }),
      })
    maybeFail('apply')
    await wait()
    const opportunity = opportunities.find((item) => item.id === opportunityId)
    if (!opportunity || effectiveOpportunity(opportunity).status !== 'open')
      throw new Error('La convocatoria está cerrada o su plazo terminó.')
    if (
      applications.some(
        (item) =>
          item.opportunityId === opportunityId && item.studentId === studentId,
      )
    )
      throw new Error(
        'Ya tienes una postulación registrada para esta convocatoria.',
      )
    const application: Application = {
      id: `app-${Date.now()}`,
      opportunityId,
      studentId,
      opportunityTitle: opportunity.title,
      companyName: opportunity.company,
      companyLogo: users.find((user) => user.id === opportunity.companyId)
        ?.logo,
      opportunityStatus: effectiveOpportunity(opportunity).status,
      date: new Date().toISOString().slice(0, 10),
      status: 'ENVIADA',
    }
    applications = [application, ...applications]
    return application
  },
  async candidates(opportunityId: string) {
    if (!USE_DEMO)
      return request<Candidate[]>(
        `/company/opportunities/${opportunityId}/candidates`,
      )
    maybeFail('candidates')
    await wait()
    if (consumeEmptyResult('candidates')) return []
    const profiles = seedManifest.candidates
    return profiles
      .map((profile): Candidate => {
        const student = users.find((user) => user.id === profile.id)
        return {
          ...profile,
          photo: student?.photo,
          cvName: student?.cvName || 'CV no disponible',
          cvUrl: student?.cvUrl || '',
          status:
            applications.find(
              (application) => application.id === profile.applicationId,
            )?.status || 'ENVIADA',
        }
      })
      .filter((candidate) =>
        applications.some(
          (application) =>
            application.id === candidate.applicationId &&
            application.opportunityId === opportunityId,
        ),
      )
  },
  async updateApplicationStatus(
    opportunityId: string,
    applicationId: string,
    status: Application['status'],
    companyId: string,
  ) {
    if (!USE_DEMO)
      return request<Application>(
        `/company/opportunities/${opportunityId}/applications/${applicationId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      )
    maybeFail('updateApplicationStatus')
    const opportunity = opportunities.find(
      (item) => item.id === opportunityId && item.companyId === companyId,
    )
    if (!opportunity)
      throw new Error('No tienes permiso para administrar esta postulación.')
    const application = applications.find(
      (item) =>
        item.id === applicationId && item.opportunityId === opportunityId,
    )
    if (!application) throw new Error('La postulación no existe.')
    await wait()
    application.status = status
    return application
  },
  async listCompanies() {
    if (!USE_DEMO) return request<CompanyReview[]>('/admin/companies')
    maybeFail('listCompanies')
    await wait()
    if (consumeEmptyResult('listCompanies')) return []
    return users
      .filter(
        (user): user is User & { role: 'company' } => user.role === 'company',
      )
      .map((company) => ({
        ...company,
        ...agreementDates(company),
        opportunityCount: opportunities.filter(
          (item) => item.companyId === company.id,
        ).length,
      }))
  },
  async setCompanyAgreement(
    companyId: string,
    dates: AgreementDates,
    admin: User,
  ): Promise<CompanyReview> {
    const validation = agreementDateError(dates)
    if (validation) throw new Error(validation)
    if (!USE_DEMO)
      return request<CompanyReview>(
        `/admin/companies/${companyId}/uas-agreement`,
        { method: 'PATCH', body: JSON.stringify(dates) },
      )
    maybeFail('setCompanyAgreement')
    await wait()
    if (admin.role !== 'admin')
      throw new Error('No tienes permisos para modificar el convenio.')
    const company = users.find(
      (user) => user.id === companyId && user.role === 'company',
    )
    if (!company) throw new Error('La empresa no existe.')
    Object.assign(company, dates)
    return {
      ...company,
      ...agreementDates(company),
      role: 'company',
      opportunityCount: opportunities.filter(
        (item) => item.companyId === company.id,
      ).length,
    }
  },
  async retryApprovalNotification(
    companyId: string,
    admin: User,
  ): Promise<CompanyReview> {
    if (!USE_DEMO)
      return request<CompanyReview>(
        `/admin/companies/${companyId}/approval-notification/retry`,
        { method: 'POST' },
      )
    maybeFail('retryApprovalNotification')
    await wait()
    if (admin.role !== 'admin')
      throw new Error('No tienes permisos para reintentar el correo.')
    const company = await this.listCompanies().then((items) =>
      items.find((item) => item.id === companyId),
    )
    if (!company || company.approvalStatus !== 'approved')
      throw new Error('La empresa aún no está aprobada.')
    return {
      ...company,
      approvalNotification: {
        status: 'sent',
        sentAt: new Date().toISOString(),
      },
    }
  },
  async resolveCompany(
    companyId: string,
    decision: 'approved' | 'rejected',
    reason: string,
    admin: User,
    dates?: AgreementDates,
  ) {
    if (!USE_DEMO)
      return request<CompanyReview>(`/admin/companies/${companyId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason, ...dates }),
      })
    maybeFail('resolveCompany')
    await wait()
    if (admin.role !== 'admin')
      throw new Error('No tienes permisos para resolver solicitudes.')
    const company = users.find(
      (user) => user.id === companyId && user.role === 'company',
    )
    if (!company) throw new Error('La empresa no existe.')
    if (company.approvalStatus !== 'pending')
      throw new Error('Esta solicitud ya fue resuelta.')
    if (!company.emailVerified)
      throw new Error(
        'La empresa debe verificar su correo antes de resolver la solicitud.',
      )
    if (decision === 'rejected' && !reason.trim())
      throw new Error('Escribe un motivo para rechazar la solicitud.')
    if (dates) {
      const validation = agreementDateError(dates)
      if (validation) throw new Error(validation)
      Object.assign(company, dates)
    }
    company.approvalStatus = decision
    company.rejectionReason =
      decision === 'rejected' ? reason.trim() : undefined
    company.resolvedAt = new Date().toISOString()
    company.resolvedBy = admin.name
    return {
      ...company,
      ...agreementDates(company),
      role: 'company' as const,
      opportunityCount: opportunities.filter(
        (item) => item.companyId === company.id,
      ).length,
    }
  },
}
