import { spawnSync } from 'node:child_process'
import { backendRoot, assertTestDatabase } from '../src/config.js'

// Use the project's installed Prisma engine, independent of a psql installation.
export function installSqlFixture(sql, databaseUrl) {
  assertTestDatabase(
    String(databaseUrl),
    'postgresql://localhost/bolsa_practicas',
  )
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/prisma/build/index.js',
      'db',
      'execute',
      '--stdin',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      cwd: backendRoot,
      input: sql,
      env: { ...process.env, DATABASE_URL: String(databaseUrl) },
      encoding: 'utf8',
    },
  )
  if (result.status !== 0)
    throw new Error(
      `No se pudo instalar el SQL de pruebas: ${result.stderr || result.error?.message}`,
    )
}
