import { randomBytes,createHash } from 'node:crypto';
import { AppError } from '../../lib/errors.js';
import { serializeUser,userInclude } from '../../lib/serializers.js';
const digest=token=>createHash('sha256').update(token).digest('hex');
export function createEmailService({prisma,config,clock,mailer}) {
  return {
    async requestVerification(userId) {
      const token=randomBytes(32).toString('hex'), now=clock();
      const user=await prisma.$transaction(async tx=>{
        await tx.$queryRaw`SELECT id_usuario FROM usuario WHERE id_usuario=${userId} FOR UPDATE`;
        const u=await tx.user.findUniqueOrThrow({where:{id:userId}});
        if(u.emailVerified) throw new AppError(409,'ALREADY_VERIFIED','Tu correo ya está verificado.');
        const last=await tx.verification.findFirst({where:{userId},orderBy:{createdAt:'desc'}});
        if(last && now-last.createdAt<60_000) {
          const e=new AppError(429,'COOLDOWN','Espera un minuto antes de solicitar otro enlace.');e.retryAfter=Math.ceil((60_000-(now-last.createdAt))/1000);throw e;
        }
        await tx.verification.deleteMany({where:{userId,usedAt:null}});
        await tx.verification.create({data:{userId,hash:digest(token),createdAt:now,expiresAt:new Date(now.getTime()+24*3600_000)}});
        return u;
      });
      const url=new URL('/verificar-email',config.frontendUrl);url.searchParams.set('token',token);
      await mailer.sendVerification({to:user.email,url:url.toString()});return {retryAfter:60};
    },
    async verifyEmail(token,currentUserId) {
      if(typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token)) return {result:'invalid'};
      return prisma.$transaction(async tx=>{
        const candidate=await tx.verification.findUnique({where:{hash:digest(token)}});
        if(!candidate) return {result:'invalid'};
        await tx.$queryRaw`SELECT id_usuario FROM usuario WHERE id_usuario=${candidate.userId} FOR UPDATE`;
        const row=await tx.verification.findUnique({where:{id:candidate.id}});
        if(!row) return {result:'invalid'};
        const user=await tx.user.findUniqueOrThrow({where:{id:row.userId},include:userInclude});
        if(row.usedAt) return {result:'already_verified',...(user.id===currentUserId?{user:serializeUser(user)}:{})};
        if(row.expiresAt<=clock()) return {result:'expired'};
        await tx.verification.update({where:{id:row.id},data:{usedAt:clock()}});
        await tx.user.update({where:{id:user.id},data:{emailVerified:true}});
        return {result:'success',...(user.id===currentUserId?{user:serializeUser({...user,emailVerified:true})}:{})};
      });
    }
  };
}
