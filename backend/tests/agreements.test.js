import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setup, account, login, prisma } from './helpers.js'
async function context() {
  const s = setup(),
    user = await account('company'),
    admin = s.agent()
  await login(admin, await account('admin'))
  return {
    ...s,
    user,
    admin,
    path: `/api/admin/companies/${user.id}/uas-agreement`,
  }
}
test('dates_are_optional_as_a_pair', async () => {
  const s = await context()
  const empty = await s.admin
    .patch(s.path)
    .send({ agreementStartDate: null, agreementEndDate: null })
    .expect(200)
  assert.equal(empty.body.agreementStartDate, null)
  assert.equal(empty.body.hasUasAgreement, undefined)
  const pair = await s.admin
    .patch(s.path)
    .send({ agreementStartDate: '2026-10-29', agreementEndDate: '2026-10-29' })
    .expect(200)
  assert.equal(pair.body.agreementEndDate, '2026-10-29')
  await s.admin
    .patch(s.path)
    .send({ agreementStartDate: '2026-10-29' })
    .expect(422)
})
test('invalid_and_reversed_calendar_dates_rejected', async () => {
  const s = await context()
  for (const pair of [
    { agreementStartDate: '2026-02-30', agreementEndDate: '2026-03-01' },
    { agreementStartDate: '2026-10-30', agreementEndDate: '2026-10-29' },
    { agreementStartDate: null, agreementEndDate: '2026-10-29' },
    { hasUasAgreement: true },
  ])
    await s.admin.patch(s.path).send(pair).expect(422)
  await assert.rejects(
    () =>
      prisma.$executeRaw`UPDATE empresa SET fecha_inicio_convenio='2026-10-29'::date,fecha_fin_convenio=NULL WHERE id_empresa=${s.user.company.id}`,
  )
})
test('only_admin_edits_dates', async () => {
  const s = await context(),
    company = s.agent()
  await login(company, s.user)
  await company
    .patch(s.path)
    .send({ agreementStartDate: null, agreementEndDate: null })
    .expect(403)
  const saved = await company
    .put('/api/companies/profile')
    .send({
      name: s.user.name,
      rfc: s.user.company.rfc,
      giro: 'TI',
      address: 'Dirección',
      agreementStartDate: '2026-01-01',
      agreementEndDate: '2026-12-31',
    })
    .expect(200)
  assert.equal(saved.body.agreementStartDate, null)
})
test('decision_and_dates_are_atomic', async () => {
  const s = await context()
  await prisma.company.update({
    where: { id: s.user.company.id },
    data: { approvalStatus: 'pending' },
  })
  const base = {
    agreementStartDate: '2026-10-01',
    agreementEndDate: '2026-11-01',
  }
  await s.admin
    .post(`/api/admin/companies/${s.user.id}/decision`)
    .send({ ...base, decision: 'rejected', reason: '' })
    .expect(422)
  assert.equal(
    (await prisma.company.findUnique({ where: { id: s.user.company.id } }))
      .agreementStartDate,
    null,
  )
  const approved = await s.admin
    .post(`/api/admin/companies/${s.user.id}/decision`)
    .send({ ...base, decision: 'approved' })
    .expect(200)
  assert.equal(approved.body.agreementStartDate, base.agreementStartDate)
  assert.equal(approved.body.approvalNotification.status, 'sent')
})
