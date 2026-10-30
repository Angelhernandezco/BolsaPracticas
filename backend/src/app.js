import express from "express"
import cookieParser from "cookie-parser"
import { installSecurity } from "./middleware/security.js"
import { authMiddleware } from "./middleware/auth.js"
import { errorHandler, notFound } from "./lib/errors.js"
import { authRoutes } from "./modules/auth/routes.js"
import { catalogRoutes } from "./modules/catalogs/routes.js"
import { createMailer } from "./services/mail.js"
import { createStorage } from "./services/storage/index.js"
import { profileRoutes } from "./modules/profiles/routes.js"
import { filesRoutes } from "./modules/files/routes.js"
import { adminRoutes } from "./modules/admin/routes.js"
import { opportunitiesRoutes } from "./modules/opportunities/routes.js"
import { applicationsRoutes } from "./modules/applications/routes.js"
import path from "node:path"
import { backendRoot } from "./config.js"
export function createApp({
  prisma,
  config = {},
  clock = () => new Date(),
  mailer,
  storage,
}) {
  const app = express()
  app.disable("x-powered-by")
  installSecurity(app, config)
  app.use(express.json({ limit: "128kb" }))
  app.use(cookieParser())
  const ctx = {
    prisma,
    config,
    clock,
    mailer: mailer || createMailer(config),
    storage: storage || (config.storageDir ? createStorage(config) : undefined),
  }
  ctx.requireSession = authMiddleware(ctx)
  app.get("/api/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: "ok" })
  })
  app.use("/api/auth", authRoutes(ctx))
  app.use("/api/catalogs", catalogRoutes(ctx))
  app.use("/api", profileRoutes(ctx))
  app.use("/api", filesRoutes(ctx))
  app.use("/api/admin", adminRoutes(ctx))
  app.use("/api", applicationsRoutes(ctx))
  app.use("/api", opportunitiesRoutes(ctx))
  app.use("/api", (_req, _res, next) => next(notFound()))
  if (config.serveFrontend) {
    const dist = path.resolve(backendRoot, "../dist")
    app.use(express.static(dist))
    app.get("/{*page}", (_req, res) =>
      res.sendFile(path.join(dist, "index.html")),
    )
  }
  app.use((_req, _res, next) => next(notFound()))
  app.use(errorHandler)
  return app
}
