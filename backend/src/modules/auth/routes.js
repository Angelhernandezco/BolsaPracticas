import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthService } from './service.js';
import { createAuthController } from './controller.js';
export function authRoutes(ctx) {
  const router=Router(), service=createAuthService(ctx), c=createAuthController(ctx,service);
  const limiter=rateLimit({windowMs:15*60_000,limit:50,standardHeaders:'draft-8',legacyHeaders:false,message:{code:'RATE_LIMIT',message:'Demasiados intentos. Inténtalo más tarde.'}});
  router.post('/register',limiter,c.register); router.post('/login',limiter,c.login);
  router.get('/session',ctx.requireSession,c.session);router.post('/logout',ctx.requireSession,c.logout);
  router.post('/email/resend',ctx.requireSession,c.resend);
  router.post('/email/verify',limiter,(req,res,next)=>ctx.requireSession(req,res,()=>next()),c.verify);
  return router;
}
