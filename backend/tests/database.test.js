import { test, after } from "node:test"
import assert from "node:assert/strict"
import request from "supertest"
import { PrismaClient } from "@prisma/client"
import { assertTestDatabase } from "../src/config.js"
import { createApp } from "../src/app.js"
import { existsSync } from "node:fs"

const prisma = new PrismaClient()
after(() => prisma.$disconnect())
test("rejects_application_database_as_test_target", () => {
  assert.throws(() =>
    assertTestDatabase(
      "postgresql://u:p@localhost/bolsa_practicas",
      "postgresql://u:p@localhost/bolsa_practicas",
    ),
  )
  assert.throws(() =>
    assertTestDatabase(
      "postgresql://u:p@localhost/production",
      "postgresql://u:p@localhost/bolsa_practicas",
    ),
  )
})
test("health_checks_database", async () => {
  const app = createApp({
    prisma,
    config: { origins: ["http://localhost:8443"] },
  })
  const res = await request(app).get("/api/health")
  assert.equal(res.status, 200)
  assert.equal(res.body.status, "ok")
})
test("enforces_unique_profiles_and_applications", async () => {
  const constraints =
    await prisma.$queryRaw`SELECT indexname AS conname FROM pg_indexes WHERE schemaname='public' AND indexdef LIKE 'CREATE UNIQUE%'`
  assert.ok(constraints.some((r) => r.conname === "estudiante_id_usuario_key"))
  assert.ok(constraints.some((r) => r.conname === "empresa_id_usuario_key"))
  assert.ok(constraints.some((r) => r.conname === "uk_postulacion_conv_est"))
})
test("optional_frontend_hosting_does_not_shadow_api", async () => {
  const app = createApp({
    prisma,
    config: { origins: [], serveFrontend: true },
  })
  await request(app).get("/registro").expect("Content-Type", /html/).expect(200)
  const res = await request(app).get("/api/unknown")
  assert.notEqual(res.status, 200)
  assert.match(res.headers["content-type"], /json/)
})
test("frontend_package_build_and_static_routes_work",async()=>{
  assert.ok(existsSync(new URL('../../frontend/dist/index.html',import.meta.url)), 'El build debe existir dentro de frontend/dist');
  const app=createApp({prisma,config:{origins:[],serveFrontend:true}});
  await request(app).get('/registro').expect('Content-Type',/html/).expect(200);
  await request(app).get('/demo-cv.pdf').expect('Content-Type',/application\/pdf/).expect(200);
  await request(app).get('/api/health').expect('Content-Type',/json/).expect(200);
})
