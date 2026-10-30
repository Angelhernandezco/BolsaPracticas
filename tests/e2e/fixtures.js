import { expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
export const password = 'TestPassword123!'
export async function login(page, email = 'e2e-student@uas.edu') {
  // Independent browser clients should not exhaust one shared proxy IP quota.
  const client = randomBytes(3)
  await page.context().setExtraHTTPHeaders({
    'X-Forwarded-For': `10.${client[0]}.${client[1]}.${client[2]}`,
  })
  await page.goto('/iniciar-sesion')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await expect(page).not.toHaveURL(/iniciar-sesion$/)
}
export async function verificationUrl(email) {
  const rows = (await readFile('backend/storage-test/e2e-outbox.jsonl', 'utf8'))
    .trim()
    .split('\n')
    .map(JSON.parse)
  const m = rows.filter((m) => m.to === email).at(-1)
  if (!m) throw new Error('No verification mail captured')
  return m.url
}
export const unique = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`
