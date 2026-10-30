import { Router } from "express"
import { requireVerified, requireRole } from "../../middleware/auth.js"
import { parseId } from "../../lib/ids.js"
import { adminService } from "./service.js"
export function adminRoutes(ctx) {
  const r = Router(),
    s = adminService(ctx)
  r.use(ctx.requireSession, requireVerified, requireRole(3))
  r.get("/companies", async (_req, res) => res.json(await s.list()))
  r.patch("/companies/:id/uas-agreement", async (req, res) =>
    res.json(await s.agreement(parseId(req.params.id), req.body)),
  )
  r.post("/companies/:id/decision", async (req, res) =>
    res.json(await s.resolve(parseId(req.params.id), req.user.id, req.body)),
  )
  return r
}
