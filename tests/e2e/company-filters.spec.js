import { test, expect } from '@playwright/test'
import { mockSession } from './presentation-fixtures.js'

test.use({ timezoneId: 'America/Mazatlan' })

for (const width of [375, 1366]) {
  test(`company_filters_combine_and_reset_${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.install({ time: new Date('2026-10-29T20:00:00Z') })
    await mockSession(page, { role: 'admin', name: 'Administrador' })
    const companies = [
      ['Activa aprobada', 'approved', '2026-10-01', '2026-10-31'],
      ['Activa pendiente', 'pending', '2026-10-01', '2026-10-31'],
      ['Sin convenio aprobada', 'approved', null, null],
      ['Vencida aprobada', 'approved', '2026-01-01', '2026-09-30'],
      ['Próxima aprobada', 'approved', '2026-11-01', '2026-12-31'],
    ].map(
      (
        [name, approvalStatus, agreementStartDate, agreementEndDate],
        index,
      ) => ({
        id: String(index + 1),
        role: 'company',
        name,
        approvalStatus,
        agreementStartDate,
        agreementEndDate,
        email: `empresa-${index}@example.com`,
        rfc: `RFC-${index}`,
        giro: 'Servicios',
        address: 'Dirección',
        emailVerified: true,
        registeredAt: '2026-10-01T20:00:00Z',
        opportunityCount: 0,
      }),
    )
    await page.route('**/api/admin/companies', (route) =>
      route.fulfill({ json: companies }),
    )
    await page.goto('/admin/empresas')
    const approval = page.getByRole('combobox', {
      name: 'Estado de solicitud',
      exact: true,
    })
    const agreement = page.getByRole('combobox', {
      name: 'Estado del convenio',
      exact: true,
    })
    await expect(approval).toBeVisible()
    await expect(agreement).toBeVisible()
    const names = page.locator('.admin-company-row .company-open-button strong')
    const columns = await page
      .locator('.agreement-companies-table .table-row')
      .evaluateAll((rows) =>
        rows.map((row) =>
          Array.from(row.children).map((cell) => ({
            left: cell.getBoundingClientRect().left,
            width: cell.getBoundingClientRect().width,
          })),
        ),
      )
    for (const row of columns.slice(1))
      for (const [index, cell] of row.entries()) {
        expect(Math.abs(cell.left - columns[0][index].left)).toBeLessThan(1)
        expect(Math.abs(cell.width - columns[0][index].width)).toBeLessThan(1)
      }
    for (const [state, expected] of [
      ['none', ['Sin convenio aprobada']],
      ['active', ['Activa aprobada', 'Activa pendiente']],
      ['expired', ['Vencida aprobada']],
      ['upcoming', ['Próxima aprobada']],
    ]) {
      await agreement.selectOption(state)
      await expect(names).toHaveText(expected)
    }
    await agreement.selectOption('active')
    await approval.selectOption('approved')
    await expect(names).toHaveText(['Activa aprobada'])
    await page.getByLabel('Buscar empresa').fill('inexistente')
    await expect(page.getByText('No encontramos coincidencias')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(approval).toHaveValue('')
    await expect(agreement).toHaveValue('')
    await expect(page.getByLabel('Buscar empresa')).toHaveValue('')
    await expect(names).toHaveCount(5)
    await page
      .locator('.filter-bar')
      .screenshot({ path: testInfo.outputPath('company-filters.png') })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}
