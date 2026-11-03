import { PrismaClient } from '@prisma/client'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
const config = loadConfig(),
  prisma = new PrismaClient()
await prisma.$connect()
const server = createApp({ prisma, config }).listen(
  config.port,
  config.host,
  () =>
    console.log(`Backend disponible en http://localhost:${config.port}/api`),
)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    }),
  )
