import { test } from "node:test"
import assert from "node:assert/strict"
import { setup, account, login, prisma } from "./helpers.js"
async function context() {
  const s = setup(),
    user = await account("company"),
    admin = s.agent(),
    messages = []
  s.setTime("2026-10-30T06:30:00Z")
  s.mailer.sendCompanyApproval = async (message) => {
    messages.push(message)
  }
  await login(admin, await account("admin"))
  await prisma.company.update({
    where: { id: user.company.id },
    data: {
      approvalStatus: "pending",
      contact: "different-contact@example.com",
    },
  })
  return {
    ...s,
    user,
    admin,
    messages,
    url: `/api/admin/companies/${user.id}/decision`,
    retry: `/api/admin/companies/${user.id}/approval-notification/retry`,
  }
}
test("approval_email_has_account_recipient_and_saved_dates", async () => {
  const s = await context()
  s.setTime("2026-10-30T06:30:00Z")
  const r = await s.admin
    .post(s.url)
    .send({
      decision: "approved",
      agreementStartDate: "2026-10-01",
      agreementEndDate: "2026-10-29",
    })
    .expect(200)
  assert.equal(r.body.approvalNotification.status, "sent")
  assert.equal(s.messages.length, 1)
  assert.equal(s.messages[0].to, s.user.email)
  assert.equal(s.messages[0].status, "active")
  assert.equal(s.messages[0].agreementEndDate, "2026-10-29")
  assert.equal(s.messages[0].referenceDate, "2026-10-29")
  assert.equal(s.messages[0].loginUrl, "http://localhost:8443/iniciar-sesion")
})
test("email_covers_all_four_agreement_states", async () => {
  const { renderCompanyApprovalEmail } = await import("../src/services/mail.js")
  for (const [status, start, end, label] of [
    ["none", null, null, "Sin convenio"],
    ["active", "2026-10-01", "2026-10-31", "activo"],
    ["expired", "2026-01-01", "2026-09-30", "venció"],
    ["upcoming", "2026-11-01", "2026-12-31", "aún no inicia"],
  ]) {
    const email = renderCompanyApprovalEmail({
      to: "company@example.com",
      companyName: "Empresa",
      loginUrl: "http://localhost:8443/iniciar-sesion",
      agreementStartDate: start,
      agreementEndDate: end,
      status,
      referenceDate: "2026-10-29",
      timezone: "America/Mazatlan",
    })
    assert.ok(email.text.includes(label))
    if (start) {
      assert.ok(email.text.includes(start))
      assert.ok(email.text.includes(end))
    }
    if (status !== "active")
      assert.ok(
        email.text.includes(
          "Los estudiantes que se postulen podrán proporcionarte más información sobre el proceso de convenio",
        ),
      )
  }
})
test("rejection_and_date_only_updates_send_no_approval_mail", async () => {
  const s = await context()
  await s.admin
    .patch(`/api/admin/companies/${s.user.id}/uas-agreement`)
    .send({ agreementStartDate: null, agreementEndDate: null })
    .expect(200)
  await s.admin
    .post(s.url)
    .send({ decision: "rejected", reason: "Datos incompletos" })
    .expect(200)
  assert.equal(s.messages.length, 0)
})
test("smtp_failure_preserves_approval_and_retry_sends", async () => {
  const s = await context()
  s.mailer.sendCompanyApproval = async () => {
    throw new Error("SMTP unavailable")
  }
  const r = await s.admin.post(s.url).send({ decision: "approved" }).expect(200)
  assert.equal(r.body.approvalStatus, "approved")
  assert.equal(r.body.approvalNotification.status, "failed")
  s.mailer.sendCompanyApproval = async (m) => s.messages.push(m)
  const retry = await s.admin.post(s.retry).expect(200)
  assert.equal(retry.body.approvalNotification.status, "sent")
  assert.equal(s.messages.length, 1)
})
test("repeated_decision_does_not_duplicate_notification", async () => {
  const s = await context()
  await s.admin.post(s.url).send({ decision: "approved" }).expect(200)
  await s.admin.post(s.url).send({ decision: "approved" }).expect(409)
  await s.admin.post(s.retry).expect(200)
  assert.equal(s.messages.length, 1)
})
test("parallel_retries_claim_once_and_expired_send_lease_can_recover", async () => {
  const s = await context()
  s.mailer.sendCompanyApproval = async () => {
    throw new Error("fail")
  }
  await s.admin.post(s.url).send({ decision: "approved" }).expect(200)
  s.mailer.sendCompanyApproval = async (m) => {
    await new Promise((resolve) => setTimeout(resolve, 70))
    s.messages.push(m)
  }
  await Promise.all([s.admin.post(s.retry), s.admin.post(s.retry)])
  assert.equal(s.messages.length, 1)
  await prisma.approvalNotification.update({
    where: { companyId: s.user.company.id },
    data: {
      status: "sending",
      claimToken: "lost-process",
      leaseUntil: new Date("2026-10-29T19:00:00Z"),
      sentAt: null,
    },
  })
  await s.admin.post(s.retry).expect(200)
  assert.equal(s.messages.length, 2)
})
