import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.js'

const env = {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  JWT_SECRET: 'a'.repeat(32),
}

test('server_host_defaults_to_loopback_and_is_configurable_for_containers', () => {
  assert.equal(loadConfig(env).host, '127.0.0.1')
  assert.equal(loadConfig({ ...env, HOST: '0.0.0.0' }).host, '0.0.0.0')
})

test('production_cookies_are_secure_unless_explicitly_configured_for_local_http', () => {
  assert.equal(loadConfig({ ...env, NODE_ENV: 'production' }).secure, true)
  assert.equal(
    loadConfig({ ...env, NODE_ENV: 'production', COOKIE_SECURE: 'false' })
      .secure,
    false,
  )
  assert.equal(loadConfig({ ...env, COOKIE_SECURE: 'true' }).secure, true)
  assert.equal(loadConfig(env).secure, false)
  for (const value of ['0', 'no', 'TRUE', '']) {
    assert.throws(
      () => loadConfig({ ...env, COOKIE_SECURE: value }),
      /COOKIE_SECURE/,
    )
  }
})
