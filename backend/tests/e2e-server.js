import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { appendFile, mkdir } from "node:fs/promises"
import { createApp } from "../src/app.js"
import { loadConfig, assertTestDatabase } from "../src/config.js"
import { seed } from "../prisma/seed.js"
assertTestDatabase(
  process.env.DATABASE_URL,
  "postgresql://localhost/bolsa_practicas",
)
const prisma = new PrismaClient()
await seed(prisma)
for (const [email, roleId] of [
  ["e2e-admin@example.com", 3],
  ["e2e-company@example.com", 2],
  ["e2e-student@uas.edu", 1],
]) {
  const career = await prisma.career.findFirst()
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: roleId === 2 ? "Empresa E2E" : "Cuenta E2E",
      roleId,
      emailVerified: true,
      passwordHash: await bcrypt.hash("TestPassword123!", 4),
      ...(roleId === 2
        ? {
            company: {
              create: {
                name: "Empresa E2E",
                rfc: "E2E210101ABC",
                giro: "Tecnología",
                address: "Dirección E2E",
                approvalStatus: "approved",
              },
            },
          }
        : roleId === 1
          ? {
              student: {
                create: {
                  name: "Cuenta E2E",
                  matricula: "e2e-student",
                  careerId: career.id,
                },
              },
            }
          : {}),
    },
  })
}
await mkdir("backend/storage-test", { recursive: true })
const mailer = {
  async sendCompanyApproval(message) { await appendFile('backend/storage-test/e2e-outbox.jsonl',JSON.stringify({...message,type:'approval'})+'\n'); },
  async sendVerification(m) {
    await appendFile(
      "backend/storage-test/e2e-outbox.jsonl",
      JSON.stringify(m) + "\n",
    )
  },
}
const config = loadConfig({
  ...process.env,
  FRONTEND_URL: "http://localhost:8444",
  STORAGE_LOCAL_DIR: "storage-test",
})
createApp({ prisma, config, mailer }).listen(3002, "127.0.0.1", () =>
  console.log("E2E backend ready (isolated database, captured mail)."),
)
