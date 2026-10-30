import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { loadSeedData, seedCatalogs } from "./seed-data.js";
export const careers = loadSeedData().careers.filter(career => career.active).map(career => career.name);
export async function seed(prisma, env = {}) {
  await seedCatalogs(prisma);
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    if (env.ADMIN_PASSWORD.length < 12)
      throw new Error("ADMIN_PASSWORD requiere al menos 12 caracteres.")
    await prisma.user.upsert({
      where: { email: env.ADMIN_EMAIL.trim().toLowerCase() },
      update: {},
      create: {
        email: env.ADMIN_EMAIL.trim().toLowerCase(),
        name: "Administrador Bolsa Prácticas",
        roleId: 3,
        emailVerified: true,
        passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
      },
    })
  }
}
if (process.argv[1]?.endsWith("seed.js")) {
  const prisma = new PrismaClient()
  try {
    await seed(prisma, process.env)
    console.log(
      "Catálogos y administrador configurado preparados (sin sobrescribir cuentas).",
    )
  } finally {
    await prisma.$disconnect()
  }
}
