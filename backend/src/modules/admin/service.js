import { z } from "zod";
import { serializeUser, userInclude } from "../../lib/serializers.js";
import { AppError, notFound, invalid } from "../../lib/errors.js";
import { validateAgreementDates } from "../../lib/agreements.js";

export const companyReviewInclude = {
  ...userInclude,
  company: { include: { ...userInclude.company.include, _count: { select: { opportunities: true } } } },
};
export function serializeCompanyReview(user) {
  const notification = user.company.approvalNotification;
  return {
    ...serializeUser(user),
    opportunityCount: user.company._count.opportunities,
    approvalNotification: notification ? { status: notification.status, sentAt: notification.sentAt?.toISOString() || null } : null,
  };
}
export function adminService({ prisma, clock }) {
  async function get(userId, database = prisma) {
    const user = await database.user.findUnique({ where: { id: userId }, include: companyReviewInclude });
    if (!user?.company) throw notFound();
    return serializeCompanyReview(user);
  }
  return {
    get,
    async list() {
      const users = await prisma.user.findMany({ where: { roleId: 2 }, include: companyReviewInclude, orderBy: { registeredAt: "desc" } });
      return users.map(serializeCompanyReview);
    },
    async agreement(userId, input) {
      const dates = validateAgreementDates(input);
      await prisma.company.update({ where: { userId }, data: dates });
      return get(userId);
    },
    async resolve(userId, adminId, input) {
      const { decision, reason = "" } = z.object({ decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(5000).optional() }).parse(input);
      if (decision === "rejected" && !reason) throw invalid("Escribe un motivo para rechazar la solicitud.");
      const hasDates = Object.hasOwn(input, "agreementStartDate") || Object.hasOwn(input, "agreementEndDate");
      const dates = hasDates ? validateAgreementDates({ agreementStartDate: input.agreementStartDate, agreementEndDate: input.agreementEndDate }) : {};
      return prisma.$transaction(async (tx) => {
        const updated = await tx.company.updateMany({
          where: { userId, approvalStatus: "pending", user: { emailVerified: true } },
          data: { ...dates, approvalStatus: decision, rejectionReason: decision === "rejected" ? reason : null, resolvedAt: clock(), resolvedById: adminId },
        });
        if (!updated.count) throw new AppError(409, "REVIEW_CONFLICT", "La solicitud ya fue resuelta o el correo aún no está verificado.");
        if (decision === "approved") {
          const company = await tx.company.findUniqueOrThrow({ where: { userId }, include: { user: true } });
          await tx.approvalNotification.create({ data: { companyId: company.id, recipient: company.user.email, agreementStartDate: company.agreementStartDate, agreementEndDate: company.agreementEndDate, createdAt: clock() } });
        }
        return get(userId, tx);
      });
    },
  };
}
