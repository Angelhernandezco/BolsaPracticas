import { test } from "node:test"
import assert from "node:assert/strict"
import { setup, account, login, prisma } from "./helpers.js"
export const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF",
)
test("validates_file_signature_and_size", async () => {
  const s = setup(),
    u = await account(),
    agent = s.agent()
  await login(agent, u)
  await agent
    .post("/api/students/cv")
    .attach("file", Buffer.from("fake"), {
      filename: "cv.pdf",
      contentType: "application/pdf",
    })
    .expect(422)
  await agent
    .post("/api/students/cv")
    .attach("file", Buffer.alloc(5_000_001), {
      filename: "big.pdf",
      contentType: "application/pdf",
    })
    .expect(413)
  await agent
    .post("/api/profiles/image")
    .attach("file", Buffer.from("<svg/>"), {
      filename: "logo.svg",
      contentType: "image/svg+xml",
    })
    .expect(422)
  await agent
    .post("/api/profiles/image")
    .attach("file", Buffer.alloc(2_000_001), {
      filename: "big.png",
      contentType: "image/png",
    })
    .expect(413)
})
test("rejects_foreign_cv_and_supports_range", async () => {
  const s = setup(),
    u = await account(),
    agent = s.agent()
  await login(agent, u)
  const res = await agent
    .post("/api/students/cv")
    .attach("file", pdf, "my-cv.pdf")
    .expect(200)
  assert.equal(res.body.cvName, "my-cv.pdf")
  const own = await agent.get(res.body.cvUrl).expect(200)
  assert.deepEqual(own.body, pdf)
  const partial = await agent
    .get(res.body.cvUrl)
    .set("Range", "bytes=0-4")
    .expect(206)
  assert.equal(partial.body.toString(), "%PDF-")
  await agent.get(res.body.cvUrl).set("Range", "bytes=9999-").expect(416)
  const stranger = s.agent()
  await login(stranger, await account())
  await stranger.get(res.body.cvUrl).expect(403)
  const admin = s.agent()
  await login(admin, await account("admin"))
  await admin.get(res.body.cvUrl).expect(403)
})
test("profile_cannot_change_privileges", async () => {
  const s = setup(),
    u = await account("company"),
    agent = s.agent()
  await login(agent, u)
  const res = await agent
    .put("/api/companies/profile")
    .send({
      name: "Nombre nuevo",
      rfc: u.company.rfc,
      giro: "TI",
      address: "Dirección",
      hasUasAgreement: true,
      role: "admin",
      emailVerified: false,
      approvalStatus: "rejected",
    })
    .expect(200)
  assert.equal(res.body.hasUasAgreement, false)
  assert.equal(res.body.role, "company")
  assert.equal(res.body.approvalStatus, "approved")
  assert.equal(res.body.emailVerified, true)
})
test("local_driver_rejects_path_traversal", async () => {
  const { createStorage } = await import("../src/services/storage/index.js")
  const s = setup()
  const store = createStorage(s.config)
  await assert.rejects(() => store.get({ driver: "local", key: "../../.env" }))
})
test("keeps_previous_driver_readable_and_s3_private", async () => {
  const { createStorage } = await import("../src/services/storage/index.js")
  const s = setup(),
    commands = []
  const client = {
    async send(command) {
      commands.push(command)
      return { Body: (await import("node:stream")).Readable.from([pdf]) }
    },
  }
  const store = createStorage(
    {
      ...s.config,
      storageDriver: "s3",
      s3Bucket: "private-test",
      awsRegion: "us-west-2",
    },
    { s3Client: client },
  )
  const key = crypto.randomUUID()
  await store.put({
    driver: "local",
    key,
    buffer: pdf,
    contentType: "application/pdf",
  })
  const local = await store.get({ driver: "local", key })
  const parts = []
  for await (const b of local.stream) parts.push(b)
  assert.deepEqual(Buffer.concat(parts), pdf)
  await store.put({
    driver: "s3",
    key,
    buffer: pdf,
    contentType: "application/pdf",
  })
  assert.equal(commands[0].input.ACL, undefined)
  assert.equal(commands[0].input.Bucket, "private-test")
  const remote = await store.get({ driver: "s3", key })
  const chunks = []
  for await (const b of remote.stream) chunks.push(b)
  assert.deepEqual(Buffer.concat(chunks), pdf)
  await store.delete({ driver: "local", key })
})
