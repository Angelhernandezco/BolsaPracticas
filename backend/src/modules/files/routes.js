import { Router } from "express"
import multer from "multer"
import { requireVerified, requireRole } from "../../middleware/auth.js"
import { forbidden } from "../../lib/errors.js"
import { filesService } from "./service.js"
export function filesRoutes(ctx) {
  const r = Router(),
    service = filesService(ctx)
  const cv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5_000_000, files: 1, fields: 0 },
  }).single("file")
  const image = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2_000_000, files: 1, fields: 0 },
  }).single("file")
  r.use(ctx.requireSession, requireVerified)
  r.post("/students/cv", requireRole(1), cv, async (req, res) =>
    res.json(await service.upload(req.user, req.file, "cv")),
  )
  r.post(
    "/profiles/image",
    requireRole(1, 2),
    (req, _res, next) =>
      req.user.roleId === 2 && req.user.company?.approvalStatus !== "approved"
        ? next(forbidden())
        : next(),
    image,
    async (req, res) =>
      res.json(
        await service.upload(
          req.user,
          req.file,
          req.user.roleId === 1 ? "photo" : "logo",
        ),
      ),
  )
  r.get("/files/:id", async (req, res) => {
    const { file, stream } = await service.read(req.user, req.params.id)
    const chunks = []
    for await (const chunk of stream) chunks.push(Buffer.from(chunk))
    const bytes = Buffer.concat(chunks)
    res.set({
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
    })
    const ranges = req.range(bytes.length)
    if (ranges === -1 || (Array.isArray(ranges) && ranges.length !== 1)) {
      res.set("Content-Range", `bytes */${bytes.length}`)
      return res.status(416).end()
    }
    if (Array.isArray(ranges)) {
      const { start, end } = ranges[0]
      res.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`)
      return res.status(206).send(bytes.subarray(start, end + 1))
    }
    res.send(bytes)
  })
  return r
}
