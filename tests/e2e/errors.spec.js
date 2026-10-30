import { test, expect } from '@playwright/test'
import { login } from './fixtures.js'
test('retry query without clearing session', async ({ page }) => {
  await login(page)
  let fail = true
  await page.route('**/api/opportunities', (route) =>
    fail ? route.abort() : route.continue(),
  )
  await page.goto('/estudiante/convocatorias')
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)
  await expect(page).toHaveURL(/estudiante\/convocatorias/)
})
test('failed save preserves values and enables button', async ({ page }) => {
  await login(page)
  await page.goto('/estudiante/perfil')
  await page
    .getByLabel('Nombre completo', { exact: true })
    .fill('Nombre conservado')
  await page.route('**/api/students/profile', (route) => route.abort())
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText(/No pudimos conectarnos/)).toBeVisible()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue(
    'Nombre conservado',
  )
  await expect(
    page.getByRole('button', { name: 'Guardar cambios' }),
  ).toBeEnabled()
})
test('session expiry redirects once with message', async ({ page }) => {
  await login(page)
  await page.route('**/api/opportunities**', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Tu sesión expiró.' }),
    }),
  )
  await page.goto('/estudiante/convocatorias')
  await expect(page).toHaveURL(/iniciar-sesion$/)
  await expect(
    page.getByText(
      'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
    ),
  ).toBeVisible()
})
