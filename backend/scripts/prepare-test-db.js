import { PrismaClient } from "@prisma/client"
import { writeFile } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import { spawnSync } from "node:child_process"
import { assertTestDatabase, backendRoot } from "../src/config.js"
import { seed } from "../prisma/seed.js"
const appUrl = process.env.DATABASE_URL
if (!appUrl)
  throw new Error("Configura DATABASE_URL antes de preparar pruebas.")
const url = new URL(process.env.TEST_DATABASE_URL || appUrl)
if (!process.env.TEST_DATABASE_URL) url.pathname = `${url.pathname}_test`
assertTestDatabase(url.toString(), appUrl)
const name = url.pathname.slice(1)
if (!/^[a-zA-Z_][a-zA-Z0-9_]*_test$/.test(name))
  throw new Error("Nombre de base de pruebas inválido.")
const adminUrl = new URL(url)
adminUrl.pathname = "/postgres"
const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() })
try {
  const exists =
    await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname=${name}`
  if (!exists.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`)
} finally {
  await admin.$disconnect()
}
const result = spawnSync(
  process.execPath,
  [`${backendRoot}/node_modules/prisma/build/index.js`, "migrate", "deploy"],
  {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "inherit",
  },
)
if (result.status !== 0)
  throw new Error("No se pudo migrar la base de pruebas.")
const prisma = new PrismaClient({ datasourceUrl: url.toString() })
try {
  await seed(prisma)
} finally {
  await prisma.$disconnect()
}
const env = {
  DATABASE_URL: url.toString(),
  JWT_SECRET: randomBytes(32).toString("hex"),
  FRONTEND_URL: "http://localhost:8443",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: "storage-test",
}
await writeFile(
  new URL("../.env.test", import.meta.url),
  Object.entries(env)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join("\n") + "\n",
)
console.log(
  "Base de pruebas preparada sin limpiar datos. .env.test generado localmente.",
)
