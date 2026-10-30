import { Router } from 'express';
import { requireRole,requireVerified,requireApprovedCompany } from '../../middleware/auth.js';
import { profileService } from './service.js';
export function profileRoutes(ctx) {
  const r=Router(),s=profileService(ctx);r.use(ctx.requireSession,requireVerified);
  r.put('/students/profile',requireRole(1),async(req,res)=>res.json(await s.update(req.user,req.body)));
  r.put('/companies/profile',requireApprovedCompany,async(req,res)=>res.json(await s.update(req.user,req.body)));return r;
}
