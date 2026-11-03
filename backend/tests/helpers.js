import { after } from 'node:test'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { loadConfig, assertTestDatabase } from '../src/config.js'
import { createApp } from '../src/app.js'
import { seed } from '../prisma/seed.js'
assertTestDatabase(
  process.env.DATABASE_URL,
  'postgresql://localhost/bolsa_practicas',
)
export const prisma = new PrismaClient()
await seed(prisma)
after(() => prisma.$disconnect())
export const password = 'TestPassword123!'
export function setup() {
  let now = new Date('2026-10-29T20:00:00Z')
  const outbox = []
  const config = loadConfig(process.env)
  const mailer = {
    async sendCompanyApproval(message) {
      outbox.push({ ...message, type: 'approval' })
    },
    async sendVerification(message) {
      outbox.push(message)
    },
  }
  const app = createApp({ prisma, config, clock: () => now, mailer })
  return {
    app,
    config,
    outbox,
    mailer,
    setTime(value) {
      now = new Date(value)
    },
    agent: () => request.agent(app),
  }
}
export function registration(role = 'student', extra = {}) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const rfcDate = new Date(
    Date.UTC(2000, 0, 1 + (parseInt(suffix.slice(0, 6), 16) % 9000)),
  )
    .toISOString()
    .slice(2, 10)
    .replaceAll('-', '')
  return {
    role,
    name: role === 'student' ? 'Estudiante Prueba' : 'Empresa Prueba',
    email: `test-${suffix}@uas.edu`,
    password,
    matricula: BigInt(`0x${suffix}`).toString(),
    career: 'Ingeniería en Software',
    rfc: `TST${rfcDate}${suffix.slice(-3).toUpperCase()}`,
    giro: 'Tecnología',
    address: 'Calle de pruebas 123',
    ...extra,
  }
}
export async function account(role = 'student', extra = {}) {
  const input = registration(role, extra)
  const career = await prisma.career.findUniqueOrThrow({
    where: { name: input.career },
  })
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      roleId: role === 'student' ? 1 : role === 'company' ? 2 : 3,
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 4),
      ...(role === 'student'
        ? {
            student: {
              create: {
                name: input.name,
                matricula: input.matricula,
                careerId: career.id,
              },
            },
          }
        : role === 'company'
          ? {
              company: {
                create: {
                  name: input.name,
                  rfc: input.rfc,
                  giro: input.giro,
                  address: input.address,
                  approvalStatus: 'approved',
                },
              },
            }
          : {}),
      ...extra.user,
    },
    include: { student: true, company: true },
  })
}
export async function login(agent, user) {
  const response = await agent
    .post('/api/auth/login')
    .send({ email: user.email, password })
  if (response.status !== 200)
    throw new Error(
      `Login failed: ${response.status} ${JSON.stringify(response.body)}`,
    )
  return response
}
