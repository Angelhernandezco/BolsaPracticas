import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setup, account, login, prisma } from './helpers.js'
const input = {
  title: 'Vacante',
  description: 'Descripción de vacante',
  area: 'Software',
  slots: 2,
  contactName: 'Contacto',
  contactEmail: 'contacto@example.com',
  careerIds: ['Ingeniería en Software'],
  closingDate: '2026-11-20',
  intent: 'publish',
}
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF')
async function fixtures() {
  const s = setup(),
    c = await account('company'),
    u = await account(),
    company = s.agent(),
    student = s.agent()
  await login(company, c)
  await login(student, u)
  const o = (
    await company.post('/api/company/opportunities').send(input).expect(201)
  ).body
  const cv = (
    await student
      .post('/api/students/cv')
      .attach('file', pdf, 'first.pdf')
      .expect(200)
  ).body
  return { ...s, c, u, company, student, o, cv }
}
test('duplicate_and_close_races_are_consistent', async () => {
  const s = await fixtures()
  const res = await Promise.all([
    s.student.post('/api/applications').send({ opportunityId: s.o.id }),
    s.student.post('/api/applications').send({ opportunityId: s.o.id }),
  ])
  assert.deepEqual(res.map((r) => r.status).sort(), [201, 409])
  const u2 = await account(),
    a = s.agent()
  await login(a, u2)
  await a.post('/api/students/cv').attach('file', pdf, 'second.pdf')
  const race = await Promise.all([
    s.company.post(`/api/company/opportunities/${s.o.id}/close`),
    a.post('/api/applications').send({ opportunityId: s.o.id }),
  ])
  assert.equal(race[0].status, 200)
  assert.ok([201, 422].includes(race[1].status))
  await a.post('/api/applications').send({ opportunityId: s.o.id }).expect(422)
})
test('company_downloads_current_cv_from_existing_application_link', async () => {
  const s = await fixtures()
  await s.student
    .post('/api/applications')
    .send({ opportunityId: s.o.id })
    .expect(201)
  const originalCandidates = await s.company
    .get(`/api/company/opportunities/${s.o.id}/candidates`)
    .expect(200)
  const existingLink = originalCandidates.body[0].cvUrl
  const updatedPdf = Buffer.concat([pdf, Buffer.from('\n% new version')])
  const replacement = await s.student
    .post('/api/students/cv')
    .attach('file', updatedPdf, 'new.pdf')
    .expect(200)
  const candidates = await s.company
    .get(`/api/company/opportunities/${s.o.id}/candidates`)
    .expect(200)
  assert.equal(candidates.body[0].cvName, 'new.pdf')
  assert.equal(candidates.body[0].cvUrl, existingLink)
  const file = await s.company.get(existingLink).expect(200)
  assert.deepEqual(file.body, updatedPdf)
  assert.match(file.headers['content-disposition'], /new\.pdf/)
  const range = await s.company
    .get(existingLink)
    .set('Range', 'bytes=0-4')
    .expect(206)
  assert.equal(range.body.toString(), '%PDF-')
  await s.company.get(replacement.body.cvUrl).expect(200)
  await s.company.get(s.cv.cvUrl).expect(403)
  await s.company.post(`/api/company/opportunities/${s.o.id}/close`).expect(200)
  assert.deepEqual(
    (await s.company.get(existingLink).expect(200)).body,
    updatedPdf,
  )
  const stranger = s.agent()
  await login(stranger, await account('company'))
  await stranger.get(existingLink).expect(403)
  const admin = s.agent()
  await login(admin, await account('admin'))
  await admin.get(existingLink).expect(403)
  await s.agent().get(existingLink).expect(401)
})
test('closed_opportunity_keeps_history_and_status_updates_require_owner', async () => {
  const s = await fixtures()
  const app = (
    await s.student
      .post('/api/applications')
      .send({ opportunityId: s.o.id })
      .expect(201)
  ).body
  const other = s.agent()
  await login(other, await account('company'))
  await other
    .patch(`/api/company/opportunities/${s.o.id}/applications/${app.id}/status`)
    .send({ status: 'ACEPTADA' })
    .expect(403)
  await s.company
    .patch(`/api/company/opportunities/${s.o.id}/applications/${app.id}/status`)
    .send({ status: 'ACEPTADA' })
    .expect(200)
  await s.company.post(`/api/company/opportunities/${s.o.id}/close`).expect(200)
  const history = await s.student.get('/api/applications/me').expect(200)
  assert.equal(history.body[0].opportunityTitle, 'Vacante')
  assert.equal(history.body[0].companyName, s.c.name)
  assert.equal(history.body[0].opportunityStatus, 'closed')
  assert.equal(history.body[0].status, 'ACEPTADA')
  assert.equal(
    (await s.student.get(`/api/opportunities/${s.o.id}`)).body.slots,
    2,
  )
})
test('profile_states_are_enforced', async () => {
  const s = await fixtures()
  await prisma.user.update({
    where: { id: s.u.id },
    data: { emailVerified: false },
  })
  await s.student.get('/api/opportunities').expect(403)
  await s.student
    .post('/api/applications')
    .send({ opportunityId: s.o.id })
    .expect(403)
  await prisma.company.update({
    where: { id: s.c.company.id },
    data: { approvalStatus: 'pending' },
  })
  await s.company.get('/api/opportunities?all=true').expect(403)
})
test('published_opportunity_cannot_return_to_draft_or_hide_history', async () => {
  const s = await fixtures()
  await s.student
    .post('/api/applications')
    .send({ opportunityId: s.o.id })
    .expect(201)
  await s.company
    .put(`/api/company/opportunities/${s.o.id}`)
    .send({ title: 'Intento de borrador', intent: 'draft' })
    .expect(422)
  await s.student.get(`/api/opportunities/${s.o.id}`).expect(200)
  const history = await s.student.get('/api/applications/me').expect(200)
  assert.equal(history.body[0].opportunityStatus, 'open')
  await s.company.post(`/api/company/opportunities/${s.o.id}/close`).expect(200)
  await s.company
    .put(`/api/company/opportunities/${s.o.id}`)
    .send({ title: 'Otro intento', intent: 'draft' })
    .expect(422)
  await s.student.get(`/api/opportunities/${s.o.id}`).expect(200)
})
