import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { loadSeedData } from '../prisma/seed-data.js'
import { loadConfig } from '../src/config.js'
import { createStorage } from '../src/services/storage/index.js'

export async function prepareDemoAssets(
  prisma,
  storage,
  manifest = loadSeedData(),
) {
  const buffer = await readFile(
    new URL('../../frontend/public/demo-cv.pdf', import.meta.url),
  )
  let created = 0
  // Only fixed demo keys and their declared owner qualify. No user uploads.
  for (const user of manifest.users.filter((item) => item.fileKey)) {
    const file = await prisma.storedFile.findFirst({
      where: {
        key: user.fileKey,
        driver: 'local',
        owner: { email: user.email },
      },
    })
    if (!file) continue
    try {
      await storage.put({ key: file.key, driver: 'local', buffer })
      created++
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
  }
  return { created }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const prisma = new PrismaClient()
  try {
    console.log(await prepareDemoAssets(prisma, createStorage(loadConfig())))
  } finally {
    await prisma.$disconnect()
  }
}
