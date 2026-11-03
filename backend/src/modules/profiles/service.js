import { selectCareers } from '../careers/service.js'
import { z } from 'zod'
import {
  phoneSchema,
  matriculaSchema,
  rfcSchema,
} from '../../lib/registration-validation.js'
import { emailSchema } from '../auth/schemas.js'
import { invalid } from '../../lib/errors.js'
import { serializeUser, userInclude } from '../../lib/serializers.js'
const base = {
  name: z.string().trim().min(1).max(80),
  phone: phoneSchema.nullish(),
  bio: z.string().max(10000).nullish(),
}
const student = z.object({
  ...base,
  matricula: matriculaSchema,
  career: z.string().min(1).optional(),
  careerId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),
})
const company = z.object({
  ...base,
  rfc: rfcSchema,
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
          const current = await tx.student.findUniqueOrThrow({
            where: { userId: user.id },
          })
          const [career] = await selectCareers(tx, {
            ids: data.careerId ? [data.careerId] : undefined,
            names: data.career ? [data.career] : [],
            existingIds: [current.careerId],
          })
          if (!career) throw invalid('Selecciona una carrera válida.')
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
