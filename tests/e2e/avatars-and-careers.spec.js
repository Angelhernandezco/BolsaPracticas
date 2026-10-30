import { test, expect } from '@playwright/test'
import {
  mockSession,
  mockStudentLists,
  mockImage,
  png,
  testOpportunity,
} from './presentation-fixtures.js'

const photo = '/api/files/photo-fixture'
const logo = '/api/files/logo-fixture'
const application = {
  id: '1',
  opportunityId: '1',
  studentId: 'student-fixture',
  opportunityTitle: 'Desarrollo web',
  companyName: 'Empresa Ejemplo',
  companyLogo: logo,
  opportunityStatus: 'open',
  date: '2026-10-01',
  status: 'ENVIADA',
}
async function expectLoaded(image) {
  await expect(image).toBeVisible()
  await expect
    .poll(() =>
      image.evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true)
}

test('student_avatars_use_photos_and_company_logos_on_all_views', async ({
  page,
}) => {
  await mockSession(page, { photo })
  await mockStudentLists(page, {
    opportunities: [{ ...testOpportunity, companyLogo: logo }],
    applications: [application],
  })
  await mockImage(page, photo)
  await mockImage(page, logo)
  await page.route('**/api/opportunities/1', (route) =>
    route.fulfill({ json: { ...testOpportunity, companyLogo: logo } }),
  )
  await page.goto('/estudiante')
  await expectLoaded(page.locator('.account-chip .avatar img'))
  await expectLoaded(page.locator('.application-row .avatar img'))
  await page.setViewportSize({ width: 375, height: 800 })
  await expectLoaded(page.locator('.mobile-dashboard-head .avatar img'))
  await page.goto('/estudiante/postulaciones')
  await expectLoaded(page.locator('.student-application .avatar img'))
  await page.goto('/estudiante/convocatorias/1')
  await expectLoaded(page.locator('.detail-company .avatar img'))
})

test('explore_filters_requested_careers_and_keeps_image_fallbacks', async ({
  page,
}) => {
  await mockSession(page)
  const opportunities = [
    {
      ...testOpportunity,
      companyLogo: logo,
      careerIds: ['Software', 'Informática'],
    },
    {
      ...testOpportunity,
      id: '2',
      company: 'Estudio Diseño',
      title: 'Diseño visual',
      initials: 'ED',
      careerIds: ['Diseño'],
    },
    {
      ...testOpportunity,
      id: '3',
      company: 'Soporte Norte',
      title: 'Soporte técnico',
      initials: 'SN',
      companyLogo: '/api/files/broken-logo',
      careerIds: ['Informática'],
    },
  ]
  await mockStudentLists(page, { opportunities })
  await mockImage(page, logo)
  await page.route('**/api/files/broken-logo', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.goto('/estudiante/convocatorias')
  const career = page.getByRole('combobox', { name: 'Carrera', exact: true })
  const titles = page.locator('.opportunity-card h3')
  await expect(career).toBeVisible()
  await career.selectOption('Software')
  await expect(titles).toHaveText(['Desarrollo web'])
  await career.selectOption('Informática')
  await expect(titles).toHaveText(['Desarrollo web', 'Soporte técnico'])
  await page.getByLabel('Buscar', { exact: true }).fill('Norte')
  await expect(titles).toHaveText(['Soporte técnico'])
  await page.getByLabel('Buscar', { exact: true }).fill('inexistente')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(career).toHaveValue('')
  await expect(titles).toHaveCount(3)
  const cards = page.locator('.opportunity-card')
  await expectLoaded(cards.nth(0).locator('.avatar img'))
  await expect(cards.nth(1).locator('.avatar')).toHaveText('ED')
  await expect(cards.nth(2).locator('.avatar')).toHaveText('SN')
})

test('company_logo_and_candidate_photo_appear_in_card_and_modal', async ({
  page,
}) => {
  await mockSession(page, {
    id: 'company-fixture',
    role: 'company',
    name: 'Empresa Ejemplo',
    logo,
    approvalStatus: 'approved',
  })
  await mockImage(page, photo)
  await mockImage(page, logo)
  await page.route('**/api/opportunities/1', (route) =>
    route.fulfill({ json: testOpportunity }),
  )
  await page.route('**/api/company/opportunities/1/candidates', (route) =>
    route.fulfill({
      json: [
        {
          id: 'student-fixture',
          applicationId: '1',
          name: 'Estudiante Ejemplo',
          initials: 'EE',
          career: 'Software',
          email: 'estudiante@uas.edu',
          date: '2026-10-01',
          cvName: 'CV.pdf',
          cvUrl: '/api/files/cv-fixture',
          photo,
          status: 'ENVIADA',
        },
      ],
    }),
  )
  await page.goto('/empresa/convocatorias/1/candidatos')
  await expectLoaded(page.locator('.account-chip .avatar img'))
  await expectLoaded(page.locator('.candidate-card .avatar img'))
  await page.getByRole('button', { name: 'Ver y administrar' }).click()
  await expectLoaded(page.getByRole('dialog').locator('.avatar img'))
})

test('broken_avatar_falls_back_and_new_photo_preview_loads', async ({
  page,
}) => {
  await mockSession(page, { photo: '/api/files/broken-photo' })
  await page.route('**/api/files/broken-photo', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.route('**/api/catalogs/careers/options', (route) =>
    route.fulfill({
      json: [{ id: '1', name: 'Ingeniería en Software', active: true }],
    }),
  )
  await page.goto('/estudiante/perfil')
  const avatar = page.locator('.photo-card .avatar')
  await expect(avatar).toHaveText('EE')
  await expect(avatar.locator('img')).toHaveCount(0)
  await page
    .locator('.photo-card input[type="file"]')
    .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  await expectLoaded(avatar.locator('img'))
})

test('admin_views_use_company_logos_in_tables_cards_and_details', async ({
  page,
}) => {
  await mockSession(page, { role: 'admin', name: 'Administrador' })
  await mockImage(page, logo)
  await page.route('**/api/admin/companies', (route) =>
    route.fulfill({
      json: [
        {
          id: 'company-fixture',
          role: 'company',
          name: 'Empresa Ejemplo',
          email: 'empresa@example.com',
          rfc: 'EMP210101ABC',
          giro: 'Servicios',
          address: 'Dirección',
          registeredAt: '2026-10-01',
          emailVerified: true,
          approvalStatus: 'pending',
          opportunityCount: 0,
          agreementStartDate: null,
          agreementEndDate: null,
          logo,
        },
      ],
    }),
  )
  await page.goto('/admin/empresas')
  await expectLoaded(page.locator('.admin-company-row .avatar img'))
  await page.locator('.company-open-button').click()
  await expectLoaded(page.getByRole('dialog').locator('.avatar img'))
  await page.goto('/admin/solicitudes')
  await expectLoaded(page.locator('.candidate-card .avatar img'))
  await page.getByRole('button', { name: 'Abrir ficha de revisión' }).click()
  await expectLoaded(page.getByRole('dialog').locator('.avatar img'))
})
