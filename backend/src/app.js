import express from 'express';
export function createApp({ prisma }) {
  const app = express();
  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  return app;
}
