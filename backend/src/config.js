import path from 'node:path'
import { fileURLToPath } from 'node:url'
export const backendRoot = fileURLToPath(new URL('../', import.meta.url))
export function assertTestDatabase(testUrl, appUrl) {
  const test = new URL(testUrl)
  const app = new URL(appUrl)
  if (!test.pathname.endsWith('_test') || test.pathname === app.pathname)
    throw new Error('Usa una base separada con sufijo _test.')
}
export function loadConfig(env = process.env) {
  if (!env.DATABASE_URL || !env.JWT_SECRET || env.JWT_SECRET.length < 32)
    throw new Error(
      'Configura DATABASE_URL y JWT_SECRET (mínimo 32 caracteres).',
    )
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:8443'
  if (
    env.TRUST_PROXY !== undefined &&
    !['false', '1'].includes(env.TRUST_PROXY)
  )
    throw new Error(
      'TRUST_PROXY debe ser false o 1 (un único proxy de confianza).',
    )
  if (
    env.COOKIE_SECURE !== undefined &&
    !['true', 'false'].includes(env.COOKIE_SECURE)
  )
    throw new Error('COOKIE_SECURE debe ser true o false.')
  return {
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    frontendUrl,
    origins: [
      new URL(frontendUrl).origin,
      ...(env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    ],
    secure:
      env.COOKIE_SECURE === undefined
        ? env.NODE_ENV === 'production'
        : env.COOKIE_SECURE === 'true',
    host: env.HOST || '127.0.0.1',
    trustProxy: env.TRUST_PROXY === '1' ? 1 : false,
    port: Number(env.PORT || 3001),
    storageDriver: env.STORAGE_DRIVER || 'local',
    storageDir: path.resolve(backendRoot, env.STORAGE_LOCAL_DIR || 'storage'),
    s3Bucket: env.S3_BUCKET,
    awsRegion: env.AWS_REGION,
    emailUser: env.EMAIL_USER,
    emailPassword: env.EMAIL_PASSWORD,
    emailHost: env.EMAIL_HOST || 'smtp.gmail.com',
    emailPort: Number(env.EMAIL_PORT || 465),
    serveFrontend: env.SERVE_FRONTEND === 'true',
  }
}
