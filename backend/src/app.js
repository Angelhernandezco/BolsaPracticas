import express from 'express';
import cookieParser from 'cookie-parser';
import { installSecurity } from './middleware/security.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler,notFound } from './lib/errors.js';
import { authRoutes } from './modules/auth/routes.js';
import { catalogRoutes } from './modules/catalogs/routes.js';
import { createMailer } from './services/mail.js';
export function createApp({ prisma,config={},clock=()=>new Date(),mailer,storage }) {
  const app = express();
  app.disable('x-powered-by'); installSecurity(app,config);
  app.use(express.json({limit:'128kb'}));app.use(cookieParser());
  const ctx={prisma,config,clock,mailer:mailer || createMailer(config),storage};ctx.requireSession=authMiddleware(ctx);
  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  app.use('/api/auth',authRoutes(ctx));app.use('/api/catalogs',catalogRoutes(ctx));
  app.use((_req,_res,next)=>next(notFound()));app.use(errorHandler);
  return app;
}
