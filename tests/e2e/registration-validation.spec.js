import { test, expect } from '@playwright/test'
import { password, unique, login } from './fixtures.js'

async function fillRegistration(page, role = 'student') {
  await page.goto(`/registro?rol=${role}`)
  await page
    .getByLabel(
      role === 'student' ? 'Nombre completo' : 'Nombre o razón social',
      { exact: true },
    )
    .fill('Registro Prueba')
  await page
    .getByLabel(
      role === 'student' ? /^Correo institucional/ : 'Correo electrónico',
      { exact: true },
    )
    .fill(`format-${unique()}@uas.edu`)
  if (role === 'student') {
    await page.getByLabel('Matrícula', { exact: true }).fill('00123456')
    await page
      .getByRole('combobox')
      .selectOption({ label: 'Ingeniería en Software' })
  } else {
    await page.getByLabel('RFC', { exact: true }).fill('ABC210315AB1')
    await page.getByLabel('Giro', { exact: true }).fill('Software')
    await page.getByLabel('Dirección', { exact: true }).fill('Calle Prueba 123')
  }
  await page.getByLabel(/^Contraseña/).fill(password)
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password)
}

test('registration UI rejects nonnumeric matricula before sending', async ({
  page,
}) => {
  let submissions = 0
  await page.route('**/api/auth/register', async (route) => {
    submissions++
    await route.fulfill({ status: 422, json: { message: 'API fallback' } })
  })
  await fillRegistration(page)
  await page.getByLabel('Matrícula', { exact: true }).fill('2214150A')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'La matrícula debe contener solo números',
  )
  expect(submissions).toBe(0)
})

test('registration UI rejects short phone and impossible RFC dates', async ({
  page,
}) => {
  let submissions = 0
  await page.route('**/api/auth/register', async (route) => {
    submissions++
    await route.fulfill({ status: 422, json: { message: 'API fallback' } })
  })
  await fillRegistration(page, 'company')
  await page.getByLabel('Teléfono', { exact: true }).fill('668123456')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'exactamente 10 dígitos',
  )
  await page.getByLabel('Teléfono', { exact: true }).fill('6681234567')
  await page.getByLabel('RFC', { exact: true }).fill('ABC210231AB1')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'fecha AAMMDD válida',
  )
  expect(submissions).toBe(0)
})

for (const rfc of ['ABC210315AB1', 'GODE900101AB1']) {
  test(`registration UI accepts RFC ${rfc.length} characters`, async ({
    page,
  }) => {
    await fillRegistration(page, 'company')
    await page.getByLabel('RFC', { exact: true }).fill(rfc)
    await page.route('**/api/auth/register', (route) =>
      route.fulfill({
        status: 422,
        json: { message: 'Formato aceptado por la pantalla' },
      }),
    )
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
    await expect(page.locator('.notice.warning')).toContainText(
      'Formato aceptado por la pantalla',
    )
  })
}

test('student profile rejects nonnumeric matricula and invalid phone before sending', async ({
  page,
}) => {
  await login(page)
  await page.goto('/estudiante/perfil')
  let updates = 0
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().endsWith('/students/profile'))
      updates++
  })
  await page.getByLabel('Matrícula', { exact: true }).fill('2214150A')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'La matrícula debe contener solo números',
  )
  await page.getByLabel('Matrícula', { exact: true }).fill('00123456')
  await page.getByLabel('Teléfono', { exact: true }).fill('668123456')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'exactamente 10 dígitos',
  )
  expect(updates).toBe(0)
})

test('company profile rejects impossible RFC date and invalid phone before sending', async ({
  page,
}) => {
  await login(page, 'e2e-company@example.com')
  await page.goto('/empresa/perfil')
  let updates = 0
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().endsWith('/companies/profile'))
      updates++
  })
  await page
    .getByLabel('Correo de contacto', { exact: true })
    .fill('contact@example.com')
  await page.getByLabel('RFC', { exact: true }).fill('ABC210231AB1')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'fecha AAMMDD válida',
  )
  await page.getByLabel('RFC', { exact: true }).fill('ABC210315AB1')
  await page.getByLabel('Teléfono', { exact: true }).fill('668123456')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.locator('.notice.warning')).toContainText(
    'exactamente 10 dígitos',
  )
  expect(updates).toBe(0)
})
