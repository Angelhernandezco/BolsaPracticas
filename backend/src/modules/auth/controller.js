import { serializeUser } from "../../lib/serializers.js"
import { createEmailService } from "./email.service.js"
export function createAuthController(ctx, service) {
  const email = createEmailService(ctx)
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.config.secure,
    path: "/api",
  }
  async function sendSession(res, user, status = 200, extras = {}) {
    const { token } = await service.createSession(user.id)
    res.cookie("bolsa-token", token, { ...cookieOptions, maxAge: 8 * 3600_000 })
    res.status(status).json({ ...serializeUser(user), ...extras })
  }
  return {
    register: async (req, res) => {
      const user = await service.register(req.body)
      let verificationEmailSent = false
      try {
        await email.requestVerification(user.id)
        verificationEmailSent = true
      } catch {
        console.error(
          "No se pudo enviar verificación; cuenta pendiente conservada.",
        )
      }
      await sendSession(res, user, 201, { verificationEmailSent })
    },
    resend: async (req, res) =>
      res.json(await email.requestVerification(req.user.id)),
    verify: async (req, res) =>
      res.json(await email.verifyEmail(req.body?.token, req.user?.id)),
    login: async (req, res) => sendSession(res, await service.login(req.body)),
    session: (req, res) => res.json(serializeUser(req.user)),
    logout: async (req, res) => {
      await service.logout(req.sessionId)
      res.clearCookie("bolsa-token", cookieOptions).json({ ok: true })
    },
  }
}
