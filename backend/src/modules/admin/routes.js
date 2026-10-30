import { Router } from 'express'
import { requireVerified, requireRole } from '../../middleware/auth.js'
import { parseId } from '../../lib/ids.js'
import { adminService } from './service.js'
import { approvalNotifications } from '../../services/approval-notifications.js'
export function adminRoutes(ctx) {
  const r = Router(),
    s = adminService(ctx)
  const notifications = approvalNotifications(ctx)
  r.use(ctx.requireSession, requireVerified, requireRole(3))
  r.get('/companies', async (_req, res) => res.json(await s.list()))
  r.patch('/companies/:id/uas-agreement', async (req, res) =>
    res.json(await s.agreement(parseId(req.params.id), req.body)),
  )
  r.post('/companies/:id/decision', async (req, res) => {
    const id = parseId(req.params.id)
    await s.resolve(id, req.user.id, req.body)
    if (req.body.decision === 'approved')
      await notifications.dispatchApprovalNotification(id)
    res.json(await s.get(id))
  })
  r.post('/companies/:id/approval-notification/retry', async (req, res) => {
    const id = parseId(req.params.id)
    await notifications.dispatchApprovalNotification(id)
    res.json(await s.get(id))
  })
  return r
}
