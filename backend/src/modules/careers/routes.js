import { Router } from 'express'
import { requireRole, requireVerified } from '../../middleware/auth.js'
import { parseId } from '../../lib/ids.js'
import { careersService } from './service.js'
export function careersRoutes(ctx) {
  const router = Router(),
    service = careersService(ctx)
  router.use(ctx.requireSession, requireVerified, requireRole(3))
  router.get('/', async (_req, res) => res.json(await service.list()))
  router.post('/', async (req, res) =>
    res.status(201).json(await service.create(req.body)),
  )
  router.patch('/:id', async (req, res) =>
    res.json(await service.update(parseId(req.params.id), req.body)),
  )
  return router
}
