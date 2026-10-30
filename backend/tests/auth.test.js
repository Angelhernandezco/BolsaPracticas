import { test } from "node:test"
import assert from "node:assert/strict"
import request from "supertest"
import {
  setup,
  registration,
  account,
  login,
  prisma,
  password,
} from "./helpers.js"
import jwt from "jsonwebtoken"
import { createApp } from "../src/app.js"
test("accepts_both_exact_uas_domains", async () => {
  const s = setup()
  for (const domain of ["uas.edu", "uas.edu.mx"]) {
    const input = registration()
    input.email = `  ${input.matricula.toUpperCase()}@${domain.toUpperCase()}  `
    const res = await s.agent().post("/api/auth/register").send(input)
    assert.equal(res.status, 201)
    assert.equal(res.body.email, `${input.matricula}@${domain}`)
    assert.equal(res.body.emailVerified, false)
    assert.equal(res.body.university, "Universidad Autónoma de Sinaloa")
    assert.equal(res.body.passwordHash, undefined)
  }
})
test("rejects_subdomains_and_public_admin", async () => {
  const s = setup()
  for (const email of ["u@sub.uas.edu", "u@uas.edu.mx.otro.com", "u@gmail.com"])
    assert.equal(
      (
        await s
          .agent()
          .post("/api/auth/register")
          .send(registration("student", { email }))
      ).status,
      422,
    )
  assert.equal(
    (await s.agent().post("/api/auth/register").send(registration("admin")))
      .status,
    422,
  )
})
test("logout_revokes_cookie_token", async () => {
  const s = setup(),
    u = await account(),
    agent = s.agent()
  const res = await login(agent, u)
  const cookie = res.headers["set-cookie"][0]
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Lax/)
  assert.equal((await agent.get("/api/auth/session")).status, 200)
  await agent.post("/api/auth/logout").expect(200)
  assert.equal(
    (await request(s.app).get("/api/auth/session").set("Cookie", cookie))
      .status,
    401,
  )
})
test("expires_after_8_hours", async () => {
  const s = setup(),
    u = await account(),
    agent = s.agent()
  await login(agent, u)
  s.setTime("2026-10-30T04:00:01Z")
  assert.equal((await agent.get("/api/auth/session")).status, 401)
})
test("cross_origin_mutation_is_rejected", async () => {
  const s = setup()
  assert.equal(
    (
      await s
        .agent()
        .post("/api/auth/login")
        .set("Origin", "https://evil.example")
        .send({ email: "x", password })
    ).status,
    403,
  )
})
test("catalog_is_available_without_session", async () => {
  const s = setup(),
    res = await s.agent().get("/api/catalogs/careers")
  assert.equal(res.status, 200)
  assert.ok(res.body.includes("Ingeniería en Software"))
})
test("matricula_and_email_are_unique", async () => {
  const s = setup(),
    input = registration()
  await s.agent().post("/api/auth/register").send(input).expect(201)
  await s.agent().post("/api/auth/register").send(input).expect(409)
  await s
    .agent()
    .post("/api/auth/register")
    .send({ ...input, email: `another-${input.matricula}@uas.edu` })
    .expect(409)
})
test("registration_ignores_empty_fields_from_other_role_form", async () => {
  const s = setup()
  await s
    .agent()
    .post("/api/auth/register")
    .send(registration("student", { rfc: "", giro: "", address: "" }))
    .expect(201)
  await s
    .agent()
    .post("/api/auth/register")
    .send(registration("company", { matricula: "", career: "" }))
    .expect(201)
})
test("database_outage_does_not_masquerade_as_expired_session", async () => {
  const s = setup(),
    token = jwt.sign(
      {
        sid: "test",
        sub: "1",
        iat: Math.floor(new Date("2026-10-29T20:00:00Z").getTime() / 1000),
        exp: Math.floor(new Date("2026-10-30T04:00:00Z").getTime() / 1000),
      },
      s.config.jwtSecret,
    )
  const failing = {
    session: {
      async findUnique() {
        throw Object.assign(new Error("Database unavailable"), {
          code: "P1001",
        })
      },
    },
  }
  const app = createApp({
    prisma: failing,
    config: s.config,
    clock: () => new Date("2026-10-29T20:00:00Z"),
  })
  await request(app)
    .get("/api/auth/session")
    .set("Cookie", `bolsa-token=${token}`)
    .expect(500)
})
test("rejects_passwords_exceeding_bcrypt_byte_limit", async () => {
  const s = setup()
  await s
    .agent()
    .post("/api/auth/register")
    .send(registration("student", { password: "😀".repeat(30) }))
    .expect(422)
})
