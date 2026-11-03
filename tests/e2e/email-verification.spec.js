import { test, expect } from '@playwright/test'

test('a stale startup session cannot undo a completed verification', async ({
  page,
}) => {
  const user = {
    id: 'verification-company',
    role: 'company',
    name: 'Empresa Prueba',
    email: 'verification@example.com',
    emailVerified: false,
    registeredAt: '2026-11-02T12:00:00Z',
    approvalStatus: 'pending',
    rfc: 'ABC210315AB1',
    giro: 'Software',
    address: 'Calle Prueba',
  }
  const sessions = []
  await page.route('**/api/auth/session', (route) => {
    sessions.push(route)
  })
  await page.route('**/api/auth/email/verify', (route) =>
    route.fulfill({
      json: { result: 'success', user: { ...user, emailVerified: true } },
    }),
  )
  await page.goto('/verificar-email?token=startup-race')
  await expect(
    page.getByRole('heading', { name: 'Correo verificado', exact: true }),
  ).toBeVisible()
  await expect.poll(() => sessions.length).toBeGreaterThan(0)
  for (const route of sessions) await route.fulfill({ json: user })
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
  await page.getByRole('link', { name: 'Continuar', exact: true }).click()
  await expect(page).toHaveURL(/estado-solicitud$/)
})

test('verification retries after a network failure without consuming twice', async ({
  page,
}) => {
  let requests = 0
  await page.route('**/api/auth/email/verify', async (route) => {
    requests++
    if (requests === 1) return route.abort('failed')
    await route.fulfill({ json: { result: 'success' } })
  })
  await page.goto('/verificar-email?token=retry-token')
  await expect(
    page.getByRole('heading', {
      name: 'No pudimos verificar el correo',
      exact: true,
    }),
  ).toBeVisible()
  expect(requests).toBe(1)
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Correo verificado', exact: true }),
  ).toBeVisible()
  expect(requests).toBe(2)
})

for (const [result, heading] of [
  ['invalid', 'Enlace inválido'],
  ['expired', 'Enlace vencido'],
]) {
  test(`verification displays ${result} links correctly`, async ({ page }) => {
    await page.route('**/api/auth/email/verify', (route) =>
      route.fulfill({ json: { result } }),
    )
    await page.goto(`/verificar-email?token=${result}`)
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
  })
}

test('a previous token response cannot overwrite the current token result', async ({
  page,
}) => {
  let firstRoute
  await page.route('**/api/auth/email/verify', async (route) => {
    if (route.request().postDataJSON().token === 'first') {
      firstRoute = route
      return
    }
    await route.fulfill({ json: { result: 'invalid' } })
  })
  await page.goto('/verificar-email?token=first')
  await expect.poll(() => Boolean(firstRoute)).toBe(true)
  await page.evaluate(() => {
    history.pushState({}, '', '/verificar-email?token=second')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(
    page.getByRole('heading', { name: 'Enlace inválido', exact: true }),
  ).toBeVisible()
  const response = page.waitForResponse(
    (res) =>
      res.url().endsWith('/api/auth/email/verify') &&
      res.request().postDataJSON().token === 'first',
  )
  await firstRoute.fulfill({ json: { result: 'success' } })
  await response
  await expect(
    page.getByRole('heading', { name: 'Enlace inválido', exact: true }),
  ).toBeVisible()
})
