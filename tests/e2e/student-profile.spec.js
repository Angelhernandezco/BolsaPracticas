import { test, expect } from '@playwright/test'
import { mockSession, mockStudentLists } from './presentation-fixtures.js'

test.use({ timezoneId: 'America/Mazatlan' })

for (const scenario of [
  {
    name: 'empty',
    phone: '   ',
    bio: '',
    matricula: ' ',
    career: '',
    cvName: '',
    completion: 0,
  },
  {
    name: 'partial',
    phone: '6681234567',
    bio: '   ',
    matricula: '20260001',
    career: 'Ingeniería en Software',
    cvName: '',
    completion: 60,
  },
  {
    name: 'complete',
    phone: '6681234567',
    bio: 'Quiero desarrollar aplicaciones.',
    matricula: '20260001',
    career: 'Ingeniería en Software',
    cvName: 'CV.pdf',
    completion: 100,
  },
]) {
  test(`student_profile_checklist_${scenario.name}`, async ({ page }) => {
    await mockSession(page, scenario)
    await mockStudentLists(page)
    await page.goto('/estudiante')
    const card = page.locator('.profile-card')
    await expect(
      card.getByText('Datos personales', { exact: true }),
    ).toHaveCount(0)
    for (const [label, field] of [
      ['Teléfono', 'phone'],
      ['Acerca de ti', 'bio'],
      ['Matrícula', 'matricula'],
      ['Carrera', 'career'],
      ['Currículum PDF', 'cvName'],
    ]) {
      const item = card.getByRole('listitem').filter({ hasText: label })
      await expect(item).toBeVisible()
      if (scenario[field].trim()) await expect(item).not.toHaveClass(/pending/)
      else await expect(item).toHaveClass(/pending/)
    }
    await expect(card.locator('.completion')).toHaveText(
      `${scenario.completion}%`,
    )
    const displayed = await card
      .locator('.progress-track')
      .evaluate(
        (track) =>
          (track.firstElementChild.getBoundingClientRect().width /
            track.clientWidth) *
          100,
      )
    expect(Math.abs(displayed - scenario.completion)).toBeLessThan(1)
  })
}

for (const scenario of [
  {
    name: 'none',
    start: null,
    end: null,
    title: 'Empresa sin convenio con la UAS',
    active: false,
  },
  {
    name: 'active',
    start: '2026-10-01',
    end: '2026-10-31',
    title: 'Convenio activo con la UAS',
    active: true,
  },
  {
    name: 'expired',
    start: '2026-01-01',
    end: '2026-09-30',
    title: 'El convenio con la UAS ya venció',
    active: false,
  },
  {
    name: 'upcoming',
    start: '2026-11-01',
    end: '2026-12-31',
    title: 'El convenio con la UAS aún no inicia',
    active: false,
  },
]) {
  test(`opportunity_agreement_in_apply_card_${scenario.name}`, async ({
    page,
  }, testInfo) => {
    await page.clock.install({ time: new Date('2026-10-29T20:00:00Z') })
    await mockSession(page)
    await mockStudentLists(page)
    await page.route('**/api/opportunities/1', (route) =>
      route.fulfill({
        json: {
          id: '1',
          companyId: 'company',
          company: 'Empresa de prueba',
          initials: 'EP',
          title: 'Convocatoria de prueba',
          description: 'Descripción',
          area: 'Software',
          slots: 1,
          publishedAt: '2026-10-01',
          contactName: 'Contacto',
          contactEmail: 'contacto@example.com',
          careerIds: ['Ingeniería en Software'],
          closingDate: '2099-12-31',
          timezone: 'America/Mazatlan',
          status: 'open',
          applications: 0,
          agreementStartDate: scenario.start,
          agreementEndDate: scenario.end,
        },
      }),
    )
    await page.goto('/estudiante/convocatorias/1')
    await expect(page.locator('.detail-main .agreement-summary')).toHaveCount(0)
    const card = page.locator('.apply-card')
    await expect(card.getByText(scenario.title, { exact: true })).toBeVisible()
    const notice = card.locator(
      scenario.active ? '.notice.success' : '.notice.warning',
    )
    await expect(notice).toContainText(scenario.title)
    const guidance = card.getByText(
      /debes comunicarle el proceso de convenio con la UAS/,
    )
    if (scenario.active) await expect(guidance).toHaveCount(0)
    else await expect(guidance).toBeVisible()
    const order = await card.evaluate((element) => {
      const safe = element.querySelector('.safe-note')
      const agreement = element.querySelector('.opportunity-agreement')
      return Boolean(
        safe &&
        agreement &&
        safe.compareDocumentPosition(agreement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })
    expect(order).toBe(true)
    await card.screenshot({
      path: testInfo.outputPath('opportunity-agreement.png'),
    })
  })
}
