import nodemailer from "nodemailer"
export function createMailer(config) {
  const transport = nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    secure: config.emailPort === 465,
    auth: {
      user: config.emailUser,
      pass: config.emailPassword?.replaceAll(" ", ""),
    },
    connectionTimeout: 15000,
    socketTimeout: 20000,
  })
  return {
    verify: () => transport.verify(),
    async sendVerification({ to, url }) {
      if (!config.emailUser || !config.emailPassword)
        throw new Error("SMTP_NOT_CONFIGURED")
      await transport.sendMail({
        from: { name: "Bolsa Prácticas", address: config.emailUser },
        to,
        subject: "Verifica tu correo — Bolsa Prácticas",
        text: `Confirma tu correo para continuar en Bolsa Prácticas:\n\n${url}\n\nEl enlace vence en 24 horas. Si no solicitaste esta cuenta, ignora este mensaje.`,
      })
    },
  }
}
