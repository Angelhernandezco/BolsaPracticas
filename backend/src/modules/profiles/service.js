import { z } from "zod"
import { emailSchema } from "../auth/schemas.js"
import { invalid } from "../../lib/errors.js"
import { serializeUser, userInclude } from "../../lib/serializers.js"
const base = {
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).nullish(),
  bio: z.string().max(10000).nullish(),
}
const student = z.object({
  ...base,
  matricula: z.string().trim().min(1).max(20),
  career: z.string().min(1),
})
const company = z.object({
  ...base,
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/),
  giro: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(255),
  contact: emailSchema.optional(),
})
export function profileService({ prisma }) {
  return {
    async update(user, input) {
      const data = (user.roleId === 1 ? student : company).parse(input)
      await prisma.$transaction(async (tx) => {
        if (user.roleId === 1) {
          const career = await tx.career.findUnique({
            where: { name: data.career },
          })
          if (!career) throw invalid("Selecciona una carrera válida.")
          await tx.student.update({
            where: { userId: user.id },
            data: {
              name: data.name,
              phone: data.phone,
              bio: data.bio,
              matricula: data.matricula,
              careerId: career.id,
            },
          })
        } else
          await tx.company.update({
            where: { userId: user.id },
            data: {
              name: data.name,
              rfc: data.rfc,
              giro: data.giro,
              address: data.address,
              contact: data.contact,
              phone: data.phone,
              bio: data.bio,
            },
          })
        await tx.user.update({
          where: { id: user.id },
          data: { name: data.name },
        })
      })
      return serializeUser(
        await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          include: userInclude,
        }),
      )
    },
  }
}
