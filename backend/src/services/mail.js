import nodemailer from "nodemailer"
export function renderCompanyApprovalEmail(message) {
  const {to,companyName,loginUrl,agreementStartDate,agreementEndDate,status,referenceDate,timezone}=message;
  const states={none:'Sin convenio activo con la UAS.',active:'Tu convenio con la UAS está activo.',expired:'Tu convenio con la UAS ya venció.',upcoming:'Tu convenio con la UAS aún no inicia.'};
  const period=agreementStartDate&&agreementEndDate?`\nFecha inicial: ${agreementStartDate}\nFecha final: ${agreementEndDate}\n`:'';
  const guidance=status==='active'?'':'\nLos estudiantes que se postulen podrán proporcionarte más información sobre el proceso de convenio.\n';
  return {to,subject:'Tu empresa fue aceptada — Bolsa Prácticas',text:`Hola, ${companyName}.\n\nTu cuenta empresarial ha sido aceptada. Ya puedes acceder al panel y administrar tus convocatorias.\n\n${states[status]}${period}${guidance}\nInformación del convenio al ${referenceDate} (${timezone}).\n\nInicia sesión: ${loginUrl}`};
}
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
    async sendCompanyApproval(message) {
      if(!config.emailUser||!config.emailPassword)throw new Error('SMTP_NOT_CONFIGURED');
      await transport.sendMail({...renderCompanyApprovalEmail(message),from:{name:'Bolsa Prácticas',address:config.emailUser}});
    },
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
