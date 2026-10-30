import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setup, account, login, prisma } from './helpers.js'
test('agreement_is_independent_from_approval', async () => {
  const s = setup(),
    c = await account('company'),
    admin = await account('admin'),
    a = s.agent()
  await login(a, admin)
  await prisma.company.update({
    where: { id: c.company.id },
    data: { approvalStatus: 'pending' },
  })
  const changed = await a
    .patch(`/api/admin/companies/${c.id}/uas-agreement`)
    .send({ agreementStartDate: '2026-10-01', agreementEndDate: '2026-11-01' })
    .expect(200)
  assert.equal(changed.body.agreementStartDate, '2026-10-01')
  assert.equal(changed.body.approvalStatus, 'pending')
  await a
    .patch(`/api/admin/companies/${c.id}/uas-agreement`)
    .send({ agreementStartDate: null, agreementEndDate: null })
    .expect(200)
  const approved = await a
    .post(`/api/admin/companies/${c.id}/decision`)
    .send({ decision: 'approved', reason: '' })
    .expect(200)
  assert.equal(approved.body.agreementStartDate, null)
  assert.equal(approved.body.resolvedBy, admin.name)
})
test('only_admin_resolves_verified_pending_companies', async () => {
  const s = setup(),
    c = await account('company'),
    agent = s.agent()
  await login(agent, c)
  await agent.get('/api/admin/companies').expect(403)
  const a = s.agent()
  await login(a, await account('admin'))
  await prisma.company.update({
    where: { id: c.company.id },
    data: { approvalStatus: 'pending' },
  })
  await prisma.user.update({
    where: { id: c.id },
    data: { emailVerified: false },
  })
  await a
    .post(`/api/admin/companies/${c.id}/decision`)
    .send({ decision: 'approved' })
    .expect(409)
  await prisma.user.update({
    where: { id: c.id },
    data: { emailVerified: true },
  })
  await a
    .post(`/api/admin/companies/${c.id}/decision`)
    .send({ decision: 'rejected', reason: ' ' })
    .expect(422)
  const rejected = await a
    .post(`/api/admin/companies/${c.id}/decision`)
    .send({ decision: 'rejected', reason: 'Datos incompletos' })
    .expect(200)
  assert.equal(rejected.body.rejectionReason, 'Datos incompletos')
})
test('concurrent_decisions_resolve_once', async () => {
  const s = setup(),
    c = await account('company'),
    a = s.agent()
  await login(a, await account('admin'))
  await prisma.company.update({
    where: { id: c.company.id },
    data: { approvalStatus: 'pending' },
  })
  const results = await Promise.all(
    ['approved', 'rejected'].map((decision) =>
      a.post(`/api/admin/companies/${c.id}/decision`).send({
        decision,
        reason: 'Revisión',
      }),
    ),
  )
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
})
test('counts_all_company_opportunities', async () => {
  const s = setup(),
    c = await account('company'),
    a = s.agent()
  await login(a, await account('admin'))
  for (const status of ['BORRADOR', 'ABIERTA', 'CERRADA'])
    await prisma.opportunity.create({
      data: { companyId: c.company.id, title: 'Prueba', slots: 1, status },
    })
  const list = await a.get('/api/admin/companies').expect(200)
  const company = list.body.find((r) => r.id === String(c.id))
  assert.equal(company.opportunityCount, 3)
  assert.equal(company.passwordHash, undefined)
})
