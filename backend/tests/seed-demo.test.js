import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { backendRoot, assertTestDatabase } from '../src/config.js'
import { seed } from '../prisma/seed.js'
import { loadSeedData } from '../prisma/seed-data.js'
const manifest = loadSeedData()
async function sandbox() {
  assertTestDatabase(
    process.env.DATABASE_URL,
    'postgresql://localhost/bolsa_practicas',
  )
  const url = new URL(process.env.DATABASE_URL),
    schema = `seed_${randomUUID().replaceAll('-', '')}`
  url.searchParams.set('schema', schema)
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    ALLOW_DEMO_SEED: 'true',
    STORAGE_LOCAL_DIR: `storage-test/${schema}`,
  }
  const migrated = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    { cwd: backendRoot, env, encoding: 'utf8' },
  )
  assert.equal(migrated.status, 0, migrated.stderr)
  const db = new PrismaClient({ datasourceUrl: url.toString() })
  await seed(db)
  return {
    db,
    run() {
      const result = spawnSync(process.execPath, ['prisma/seed-demo.js'], {
        cwd: backendRoot,
        env,
        encoding: 'utf8',
      })
      assert.equal(result.status, 0, result.stderr)
    },
  }
}
test('demo_seed_preserves_existing_accounts_and_never_shares_their_cv', async () => {
  const { db, run } = await sandbox()
  try {
    const career = await db.career.findFirst()
    const student = await db.user.create({
      data: {
        email: 'mariana.lopez@uas.edu',
        name: 'Estudiante existente',
        roleId: 1,
        emailVerified: true,
        passwordHash: 'existing-hash',
        student: {
          create: {
            name: 'Estudiante existente',
            matricula: 'EXISTENTE',
            careerId: career.id,
          },
        },
      },
      include: { student: true },
    })
    const file = await db.storedFile.create({
      data: {
        ownerId: student.id,
        driver: 'local',
        key: randomUUID(),
        mime: 'application/pdf',
        name: 'CV privado existente.pdf',
        size: 123,
        purpose: 'cv',
      },
    })
    await db.student.update({
      where: { id: student.student.id },
      data: { cvId: file.id },
    })
    await db.user.create({
      data: {
        email: 'empresa@demo.mx',
        name: 'Empresa existente',
        roleId: 2,
        passwordHash: 'existing-hash',
        company: { create: { name: 'Empresa existente', rfc: 'EXI210101ABC' } },
      },
    })
    const before = await db.user.findMany({
      include: { student: true, company: true },
    })
    run()
    assert.deepEqual(
      await db.user.findMany({ include: { student: true, company: true } }),
      before,
    )
    assert.equal(await db.opportunity.count(), 0)
    assert.equal(await db.application.count(), 0)
    assert.equal(await db.storedFile.count(), 1)
  } finally {
    await db.$disconnect()
  }
})
test('demo_seed_creates_fixtures_only_for_new_accounts_and_repeat_is_safe', async () => {
  const { db, run } = await sandbox()
  try {
    run()
    assert.equal(await db.user.count(), manifest.users.length)
    assert.equal(await db.opportunity.count(), manifest.opportunities.length)
    assert.equal(await db.application.count(), manifest.applications.length)
    const cvCount = await db.storedFile.count()
    run()
    assert.equal(await db.user.count(), manifest.users.length)
    assert.equal(await db.opportunity.count(), manifest.opportunities.length)
    assert.equal(await db.application.count(), manifest.applications.length)
    assert.equal(await db.storedFile.count(), cvCount)
  } finally {
    await db.$disconnect()
  }
})
