import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const backendRoot = fileURLToPath(new URL('../', import.meta.url));
export function assertTestDatabase(testUrl, appUrl) {
  const test = new URL(testUrl);
  const app = new URL(appUrl);
  if (!test.pathname.endsWith('_test') || test.pathname === app.pathname) throw new Error('Usa una base separada con sufijo _test.');
}
export function loadConfig(env = process.env) {
  if (!env.DATABASE_URL || !env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('Configura DATABASE_URL y JWT_SECRET (mínimo 32 caracteres).');
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:8443';
  return { databaseUrl: env.DATABASE_URL, jwtSecret: env.JWT_SECRET, frontendUrl,
    origins: [new URL(frontendUrl).origin, ...(env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)],
    secure: env.NODE_ENV === 'production', port: Number(env.PORT || 3001),
    storageDriver: env.STORAGE_DRIVER || 'local', storageDir: path.resolve(backendRoot, env.STORAGE_LOCAL_DIR || 'storage'),
    s3Bucket: env.S3_BUCKET, awsRegion: env.AWS_REGION,
    emailUser: env.EMAIL_USER, emailPassword: env.EMAIL_PASSWORD, emailHost: env.EMAIL_HOST || 'smtp.gmail.com',
    emailPort: Number(env.EMAIL_PORT || 465), serveFrontend: env.SERVE_FRONTEND === 'true' };
}
