import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
try {
  console.table(
    await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
  )
} finally {
  await prisma.$disconnect()
}
