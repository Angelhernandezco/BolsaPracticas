import { PrismaClient } from '@prisma/client'
import { loadSeedData } from '../prisma/seed-data.js'
import { appendFile, mkdir } from 'node:fs/promises'
import { createApp } from '../src/app.js'
import { loadConfig, assertTestDatabase } from '../src/config.js'
import { seed } from '../prisma/seed.js'
assertTestDatabase(
  process.env.DATABASE_URL,
  'postgresql://localhost/bolsa_practicas',
)
const prisma = new PrismaClient()
await seed(prisma)
const manifest = loadSeedData()
for (const account of manifest.users.filter(
  (user) => user.passwordKey === 'e2e',
)) {
  const roleId = { student: 1, company: 2, admin: 3 }[account.role]
  const career = await prisma.career.findUniqueOrThrow({
    where: { seedKey: 'software' },
  })
  await prisma.user.upsert({
    where: { email: account.email },
    update: {},
    create: {
      email: account.email,
      name: account.name,
      roleId,
      emailVerified: true,
      passwordHash: manifest.passwords.e2e.hash,
      ...(roleId === 2
        ? {
            company: {
              create: {
                name: account.name,
                rfc: account.rfc,
                giro: account.giro,
                address: account.address,
                approvalStatus: account.approvalStatus,
              },
            },
          }
        : roleId === 1
          ? {
              student: {
                create: {
                  name: account.name,
                  matricula: account.matricula,
                  careerId: career.id,
                },
              },
            }
          : {}),
    },
  })
}
await mkdir('backend/storage-test', { recursive: true })
const mailer = {
  async sendCompanyApproval(message) {
    await appendFile(
      'backend/storage-test/e2e-outbox.jsonl',
      JSON.stringify({ ...message, type: 'approval' }) + '\n',
    )
  },
  async sendVerification(m) {
    await appendFile(
      'backend/storage-test/e2e-outbox.jsonl',
      JSON.stringify(m) + '\n',
    )
  },
}
const config = loadConfig({
  ...process.env,
  FRONTEND_URL: 'http://localhost:8444',
  STORAGE_LOCAL_DIR: 'storage-test',
})
const app = createApp({ prisma, config, mailer })
// Only this isolated test server trusts the local Vite proxy's client address.
app.set('trust proxy', 'loopback')
app.listen(3002, '127.0.0.1', () =>
  console.log('E2E backend ready (isolated database, captured mail).'),
)
