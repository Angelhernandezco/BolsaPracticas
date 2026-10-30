import { Router } from 'express'
import {
  requireRole,
  requireVerified,
  requireApprovedCompany,
} from '../../middleware/auth.js'
import { forbidden } from '../../lib/errors.js'
import { parseId } from '../../lib/ids.js'
import { opportunitiesService } from './service.js'
export function opportunitiesRoutes(ctx) {
  const r = Router(),
    s = opportunitiesService(ctx)
  r.use(
    ctx.requireSession,
    requireVerified,
    requireRole(1, 2),
    (req, _res, next) =>
      req.user.roleId === 2 && req.user.company?.approvalStatus !== 'approved'
        ? next(forbidden())
        : next(),
  )
  r.get('/opportunities', async (req, res) =>
    res.json(await s.list(req.user, req.query.all === 'true')),
  )
  r.get('/opportunities/:id', async (req, res) =>
    res.json(await s.get(req.user, parseId(req.params.id))),
  )
  r.post('/company/opportunities', requireApprovedCompany, async (req, res) =>
    res.status(201).json(await s.save(req.user, null, req.body)),
  )
  r.put(
    '/company/opportunities/:id',
    requireApprovedCompany,
    async (req, res) =>
      res.json(await s.save(req.user, parseId(req.params.id), req.body)),
  )
  for (const action of ['close', 'reactivate'])
    r.post(
      `/company/opportunities/:id/${action}`,
      requireApprovedCompany,
      async (req, res) =>
        res.json(await s.change(req.user, parseId(req.params.id), action)),
    )
  return r
}
