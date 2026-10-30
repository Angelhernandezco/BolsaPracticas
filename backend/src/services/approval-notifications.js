import { randomUUID } from "node:crypto"
import { AppError, notFound } from "../lib/errors.js"
import { agreementStatusOn } from "../lib/agreements.js"
import { mazatlanDate } from "../lib/dates.js"

export function approvalNotifications({ prisma, mailer, clock, config }) {
  return {
    async dispatchApprovalNotification(userId) {
      const company = await prisma.company.findUnique({
        where: { userId },
        include: { approvalNotification: true },
      })
      if (!company) throw notFound()
      if (company.approvalStatus !== "approved")
        throw new AppError(
          409,
          "NOT_APPROVED",
          "La empresa aún no está aprobada.",
        )
      const notification = company.approvalNotification
      if (!notification)
        throw new AppError(
          409,
          "NO_NOTIFICATION",
          "No hay una notificación de aprobación pendiente.",
        )
      const now = clock(),
        claimToken = randomUUID()
      const claimed = await prisma.approvalNotification.updateMany({
        where: {
          id: notification.id,
          OR: [
            { status: { in: ["pending", "failed"] } },
            { status: "sending", leaseUntil: { lt: now } },
          ],
        },
        data: {
          status: "sending",
          claimToken,
          leaseUntil: new Date(now.getTime() + 60_000),
        },
      })
      if (!claimed.count) return
      try {
        const referenceDate = mazatlanDate(clock())
        await mailer.sendCompanyApproval({
          to: notification.recipient,
          companyName: company.name,
          loginUrl: new URL("/iniciar-sesion", config.frontendUrl).toString(),
          agreementStartDate:
            notification.agreementStartDate?.toISOString().slice(0, 10) || null,
          agreementEndDate:
            notification.agreementEndDate?.toISOString().slice(0, 10) || null,
          status: agreementStatusOn(notification, referenceDate),
          referenceDate,
          timezone: "America/Mazatlan",
        })
        await prisma.approvalNotification.updateMany({
          where: { id: notification.id, claimToken },
          data: {
            status: "sent",
            sentAt: clock(),
            claimToken: null,
            leaseUntil: null,
          },
        })
      } catch {
        await prisma.approvalNotification.updateMany({
          where: { id: notification.id, claimToken },
          data: { status: "failed", claimToken: null, leaseUntil: null },
        })
      }
    },
  }
}
