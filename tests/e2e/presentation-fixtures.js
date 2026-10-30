export const testStudent = {
  id: 'student-fixture',
  role: 'student',
  name: 'Estudiante Ejemplo',
  email: 'estudiante@uas.edu',
  emailVerified: true,
  registeredAt: '2026-10-01',
  career: 'Ingeniería en Software',
  careerId: '1',
  careerActive: true,
  matricula: '20260001',
  university: 'Universidad Autónoma de Sinaloa',
  phone: '',
  bio: '',
}

export async function mockSession(page, changes = {}) {
  const user = { ...testStudent, ...changes }
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: user }),
  )
  return user
}

export async function mockStudentLists(
  page,
  { opportunities = [], applications = [] } = {},
) {
  await page.route('**/api/opportunities', (route) =>
    route.fulfill({ json: opportunities }),
  )
  await page.route('**/api/applications/me', (route) =>
    route.fulfill({ json: applications }),
  )
}

export const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
export async function mockImage(page, url) {
  await page.route(`**${url}`, (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  )
}

export const testOpportunity = {
  id: '1',
  companyId: 'company-fixture',
  company: 'Empresa Ejemplo',
  initials: 'EE',
  title: 'Desarrollo web',
  description: 'Descripción de la convocatoria',
  area: 'Tecnología',
  slots: 2,
  publishedAt: '2026-10-01',
  contactName: 'Contacto',
  contactEmail: 'contacto@example.com',
  careerIds: ['Ingeniería en Software'],
  careerAssociations: [
    { id: '1', name: 'Ingeniería en Software', active: true },
  ],
  closingDate: '2099-12-31',
  timezone: 'America/Mazatlan',
  status: 'open',
  applications: 0,
  agreementStartDate: null,
  agreementEndDate: null,
}
