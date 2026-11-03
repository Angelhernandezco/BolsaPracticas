import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test(
  'backend_image_can_import_the_api_and_its_storage_adapters',
  {
    skip: process.env.RUN_DOCKER_TESTS !== 'true',
  },
  () => {
    const result = spawnSync(
      process.env.DOCKER_BIN || 'docker',
      [
        'run',
        '--rm',
        '--entrypoint',
        'node',
        process.env.BACKEND_IMAGE || 'bolsapracticas-backend:v1.0',
        '--input-type=module',
        '-e',
        "await import('./src/app.js')",
      ],
      { encoding: 'utf8', timeout: 60000 },
    )
    assert.equal(result.status, 0, result.error?.message || result.stderr)
  },
)
