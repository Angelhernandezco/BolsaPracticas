import { Router } from "express"
export function catalogRoutes({ prisma }) {
  const r = Router()
  r.get("/careers", async (_req, res) =>
    res.json(
      (await prisma.career.findMany({ where:{active:true},orderBy: { id: "asc" } })).map(
        (c) => c.name,
      ),
    ),
  )
  return r
}
