import { PrismaClient } from "@prisma/client"

import { seed } from "./seed.js"

import { loadSeedData, seedDemo } from "./seed-data.js"

import { loadConfig } from "../src/config.js"

import { createStorage } from "../src/services/storage/index.js"

import { prepareDemoAssets } from "../scripts/prepare-demo-assets.js"

if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_DEMO_SEED !== "true"
) {
  throw new Error(
    "Semilla demo deshabilitada. Habilita ALLOW_DEMO_SEED solo en desarrollo.",
  )
}

const prisma = new PrismaClient()

try {
  const manifest = loadSeedData()

  await seed(prisma)

  const result = await seedDemo(prisma, manifest, {
    referenceDate: process.env.SEED_REFERENCE_DATE || manifest.referenceDate,
  })

  if (result.created) {
    await prepareDemoAssets(prisma, createStorage(loadConfig()), manifest)

    console.log("Datos públicos de demostración y CV preparados.")
  } else
    console.log(
      "Semilla demo omitida: hay correos reservados existentes; se conservaron cuentas, CV y relaciones.",
    )
} finally {
  await prisma.$disconnect()
}
