import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'

const env = {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  JWT_SECRET: 'x'.repeat(32),
}

test('auth_limits_are_per_client_behind_the_configured_single_proxy', async () => {
  const app = createApp({ config: loadConfig({ ...env, TRUST_PROXY: '1' }) })
  for (let i = 0; i < 50; i++) {
    await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', '198.51.100.1')
      .send({})
      .expect(422)
  }
  await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', '198.51.100.1')
    .send({})
    .expect(429)
  await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', '198.51.100.2')
    .send({})
    .expect(422)
})

test('proxy_trust_is_disabled_by_default_and_never_accepts_an_unbounded_setting', () => {
  const app = createApp({ config: loadConfig(env) })
  assert.equal(app.get('trust proxy fn')('198.51.100.1', 0), false)
  for (const value of ['true', '2', 'yes']) {
    assert.throws(
      () => loadConfig({ ...env, TRUST_PROXY: value }),
      /TRUST_PROXY/,
    )
  }
})
