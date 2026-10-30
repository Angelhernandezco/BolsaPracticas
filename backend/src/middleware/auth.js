import jwt from 'jsonwebtoken';
import { AppError, forbidden } from '../lib/errors.js';
import { userInclude } from '../lib/serializers.js';
export function authMiddleware({prisma,config,clock}) {
  return async (req,_res,next)=>{
    try {
      const payload=jwt.verify(req.cookies?.['bolsa-token'],config.jwtSecret,{algorithms:['HS256'],clockTimestamp:Math.floor(clock().getTime()/1000)});
      const session=await prisma.session.findUnique({where:{id:payload.sid},include:{user:{include:userInclude}}});
      if(!session || session.expiresAt<=clock() || !session.user.active || String(session.userId)!==payload.sub) throw new Error('Invalid session');
      req.user=session.user;req.sessionId=session.id; next();
    } catch { next(new AppError(401,'SESSION_EXPIRED','Tu sesión expiró. Inicia sesión nuevamente.')); }
  };
}
export const requireRole=(...roles)=>(req,_res,next)=>roles.includes(req.user.roleId)?next():next(forbidden());
export function requireVerified(req,_res,next) { req.user.emailVerified?next():next(new AppError(403,'EMAIL_UNVERIFIED','Verifica tu correo para continuar.')); }
export function requireApprovedCompany(req,_res,next) { req.user.roleId===2 && req.user.company?.approvalStatus==='approved'?next():next(forbidden()); }
