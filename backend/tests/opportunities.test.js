import { test } from "node:test"
import assert from "node:assert/strict"
import { setup, account, login, prisma } from "./helpers.js"
export const validOpportunity = {
  title: "Prácticas de desarrollo",
  description: "Apoyo al desarrollo web",
  area: "Software",
  slots: 2,
  contactName: "Contacto",
  contactEmail: "contacto@example.com",
  careerIds: ["Ingeniería en Software"],
  closingDate: "2026-10-29",
  intent: "publish",
}
test("draft_requires_only_title", async () => {
  const s = setup(),
    a = s.agent()
  await login(a, await account("company"))
  const r = await a
    .post("/api/company/opportunities")
    .send({ title: "Borrador", intent: "draft" })
    .expect(201)
  assert.equal(r.body.status, "draft")
  assert.equal(r.body.slots, 0)
  await a
    .post("/api/company/opportunities")
    .send({ intent: "draft" })
    .expect(422)
})
test("published_requires_complete_fields", async () => {
  const s = setup(),
    a = s.agent()
  await login(a, await account("company"))
  for (const change of [
    { slots: 0 },
    { careerIds: [] },
    { closingDate: "2026-02-30" },
    { closingDate: "2026-10-28" },
    { contactEmail: "bad" },
    { intent: "invalid" },
  ])
    await a
      .post("/api/company/opportunities")
      .send({ ...validOpportunity, ...change })
      .expect(422)
})
test("calendar_deadline_uses_mazatlan", async () => {
  const s = setup(),
    a = s.agent()
  await login(a, await account("company"))
  const r = await a
    .post("/api/company/opportunities")
    .send(validOpportunity)
    .expect(201)
  assert.equal(r.body.closingDate, "2026-10-29")
  s.setTime("2026-10-30T06:59:59Z")
  const b = s.agent()
  const u = await account()
  await login(b, u)
  assert.equal(
    (await b.get(`/api/opportunities/${r.body.id}`)).body.status,
    "open",
  )
  s.setTime("2026-10-30T07:00:00Z")
  assert.equal(
    (await b.get(`/api/opportunities/${r.body.id}`)).body.status,
    "closed",
  )
})
test("list_hides_foreign_drafts_and_admin_has_no_access", async () => {
  const s = setup(),
    a = s.agent(),
    company = await account("company")
  await login(a, company)
  const r = await a
    .post("/api/company/opportunities")
    .send({ title: "Privado", intent: "draft" })
    .expect(201)
  const student = s.agent()
  await login(student, await account())
  assert.ok(
    !(await student.get("/api/opportunities?all=true")).body.some(
      (o) => o.id === r.body.id,
    ),
  )
  await student.get(`/api/opportunities/${r.body.id}`).expect(403)
  const other = s.agent()
  await login(other, await account("company"))
  await other
    .put(`/api/company/opportunities/${r.body.id}`)
    .send(validOpportunity)
    .expect(403)
  const admin = s.agent()
  await login(admin, await account("admin"))
  await admin.get("/api/opportunities").expect(403)
})
test("agreement_is_current_and_expired_can_be_edited_before_reactivation", async () => {
  const s = setup(),
    c = await account("company"),
    a = s.agent()
  await login(a, c)
  const r = await a
    .post("/api/company/opportunities")
    .send(validOpportunity)
    .expect(201)
  await prisma.company.update({
    where: { id: c.company.id },
    data: { agreementStartDate:new Date("2026-01-01"), agreementEndDate:new Date("2026-12-31") },
  })
  assert.equal(
    (await a.get(`/api/opportunities/${r.body.id}`)).body.agreementStartDate,
    "2026-01-01",
  )
  s.setTime("2026-10-30T08:00:00Z")
  await login(a, c)
  await a.post(`/api/company/opportunities/${r.body.id}/reactivate`).expect(422)
  const edited = await a
    .put(`/api/company/opportunities/${r.body.id}`)
    .send({ ...validOpportunity, closingDate: "2026-11-01", intent: "save" })
    .expect(200)
  assert.equal(edited.body.status, "closed")
  await a.post(`/api/company/opportunities/${r.body.id}/reactivate`).expect(200)
})
