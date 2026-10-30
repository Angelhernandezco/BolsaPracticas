import { z } from 'zod';
import { serializeUser,userInclude } from '../../lib/serializers.js';
import { AppError,notFound,invalid } from '../../lib/errors.js';
const include={...userInclude,company:{include:{...userInclude.company.include,_count:{select:{opportunities:true}}}}};
const serialize=u=>({...serializeUser(u),opportunityCount:u.company._count.opportunities});
export function adminService({prisma,clock}) {return {
  async list(){return (await prisma.user.findMany({where:{roleId:2},include,orderBy:{registeredAt:'desc'}})).map(serialize);},
  async agreement(userId,input){const {hasUasAgreement}=z.object({hasUasAgreement:z.boolean()}).parse(input);
    const c=await prisma.company.findUnique({where:{userId}});if(!c)throw notFound();
    await prisma.company.update({where:{userId},data:{hasUasAgreement}});return serialize(await prisma.user.findUniqueOrThrow({where:{id:userId},include}));},
  async resolve(userId,adminId,input){const {decision,reason=''}=z.object({decision:z.enum(['approved','rejected']),reason:z.string().trim().max(5000).optional()}).parse(input);
    if(decision==='rejected'&&!reason)throw invalid('Escribe un motivo para rechazar la solicitud.');
    return prisma.$transaction(async tx=>{
      const updated=await tx.company.updateMany({where:{userId,approvalStatus:'pending',user:{emailVerified:true}},data:{approvalStatus:decision,rejectionReason:decision==='rejected'?reason:null,resolvedAt:clock(),resolvedById:adminId}});
      if(!updated.count)throw new AppError(409,'REVIEW_CONFLICT','La solicitud ya fue resuelta o el correo aún no está verificado.');
      return serialize(await tx.user.findUniqueOrThrow({where:{id:userId},include}));
    });}
};}
