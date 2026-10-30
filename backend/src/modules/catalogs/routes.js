import { Router } from 'express'
export function catalogRoutes({ prisma }) {
  const r = Router()
  r.get('/careers/options', async (_req, res) =>
    res.json(
      (
        await prisma.career.findMany({
          where: { active: true },
          orderBy: { name: 'asc' },
        })
      ).map((c) => ({ id: String(c.id), name: c.name, active: c.active })),
    ),
  )
  r.get('/careers', async (_req, res) =>
    res.json(
      (
        await prisma.career.findMany({
          where: { active: true },
          orderBy: { id: 'asc' },
        })
      ).map((c) => c.name),
    ),
  )
  return r
}
