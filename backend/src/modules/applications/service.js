import { z } from "zod"
import { forbidden, invalid, notFound } from "../../lib/errors.js"
import { fileUrl } from "../../lib/serializers.js"
import { effectiveStatus } from "../../lib/dates.js"
import { lockOpportunity, checkOwner } from "../opportunities/service.js"
const applicationInclude = {
  student: { include: { user: true, career: true } },
  opportunity: { include: { company: true } },
  cv: true,
}
function serialize(a, now) {
  return {
    id: String(a.id),
    opportunityId: String(a.opportunityId),
    studentId: String(a.student.userId),
    opportunityTitle: a.opportunity.title || a.opportunityTitle,
    companyName: a.opportunity.company.name || a.companyName,
    opportunityStatus: effectiveStatus(a.opportunity, now),
    date: a.date.toISOString(),
    status: a.status,
  }
}
export function applicationsService({ prisma, clock }) {
  return {
    async mine(user) {
      return (
        await prisma.application.findMany({
          where: { studentId: user.student.id },
          include: applicationInclude,
          orderBy: { date: "desc" },
        })
      ).map((a) => serialize(a, clock()))
    },
    async apply(user, opportunityId) {
      return prisma.$transaction(async (tx) => {
        const o = await lockOpportunity(tx, opportunityId)
        if (
          effectiveStatus(o, clock()) !== "open" ||
          o.company.approvalStatus !== "approved" ||
          !o.company.user.active
        )
          throw invalid("La convocatoria está cerrada o su plazo terminó.")
        // Re-read current CV after acquiring the opportunity lock; never trust the client payload.
        const student = await tx.student.findUniqueOrThrow({
          where: { userId: user.id },
        })
        if (!student.cvId || !student.careerId || !student.matricula)
          throw invalid(
            "Completa tu perfil y carga tu currículum antes de postularte.",
          )
        const a = await tx.application.create({
          data: {
            opportunityId,
            studentId: student.id,
            cvId: student.cvId,
            opportunityTitle: o.title,
            companyName: o.company.name,
            date: clock(),
          },
          include: applicationInclude,
        })
        return serialize(a, clock())
      })
    },
    async candidates(user, id) {
      const o = await prisma.opportunity.findUnique({ where: { id } })
      if (!o) throw notFound()
      checkOwner(o, user)
      return (
        await prisma.application.findMany({
          where: { opportunityId: id },
          include: applicationInclude,
          orderBy: { date: "desc" },
        })
      ).map((a) => ({
        id: String(a.student.userId),
        applicationId: String(a.id),
        name: a.student.user.name,
        career: a.student.career.name,
        date: a.date.toISOString(),
        cvName: a.cv?.name || "CV no disponible",
        cvUrl: fileUrl(a.cvId) || "",
        initials: a.student.user.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2),
        email: a.student.user.email,
        phone: a.student.phone,
        bio: a.student.bio,
        status: a.status,
      }))
    },
    async status(user, id, applicationId, input) {
      const { status } = z
        .object({
          status: z.enum(["ENVIADA", "EN_REVISION", "ACEPTADA", "RECHAZADA"]),
        })
        .parse(input)
      return prisma.$transaction(async (tx) => {
        const o = await lockOpportunity(tx, id)
        checkOwner(o, user)
        const a = await tx.application.findUnique({
          where: { id: applicationId },
          include: applicationInclude,
        })
        if (!a || a.opportunityId !== id) throw notFound()
        return serialize(
          await tx.application.update({
            where: { id: applicationId },
            data: { status },
            include: applicationInclude,
          }),
          clock(),
        )
      })
    },
  }
}
