import { Router } from "express"
import {
  requireRole,
  requireVerified,
  requireApprovedCompany,
} from "../../middleware/auth.js"
import { parseId } from "../../lib/ids.js"
import { applicationsService } from "./service.js"
export function applicationsRoutes(ctx) {
  const r = Router(),
    s = applicationsService(ctx)
  r.use(ctx.requireSession, requireVerified)
  r.get("/applications/me", requireRole(1), async (req, res) =>
    res.json(await s.mine(req.user)),
  )
  r.post("/applications", requireRole(1), async (req, res) =>
    res
      .status(201)
      .json(await s.apply(req.user, parseId(req.body?.opportunityId))),
  )
  r.get(
    "/company/opportunities/:id/candidates",
    requireApprovedCompany,
    async (req, res) =>
      res.json(await s.candidates(req.user, parseId(req.params.id))),
  )
  r.patch(
    "/company/opportunities/:id/applications/:applicationId/status",
    requireApprovedCompany,
    async (req, res) =>
      res.json(
        await s.status(
          req.user,
          parseId(req.params.id),
          parseId(req.params.applicationId),
          req.body,
        ),
      ),
  )
  return r
}
