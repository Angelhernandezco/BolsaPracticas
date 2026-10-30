import { selectCareers } from '../careers/service.js';
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { AppError, invalid } from "../../lib/errors.js"
import { userInclude } from "../../lib/serializers.js"
import { registrationSchema, loginSchema, isUasEmail } from "./schemas.js"
export function createAuthService(ctx) {
  const { prisma, config, clock } = ctx
  return {
    async register(input) {
      const normalized = { ...input }
      for (const key of ["matricula", "career", "rfc", "giro", "address"])
        if (normalized[key] === "") delete normalized[key]
      const data = registrationSchema.parse(normalized)
      if (
        data.role === "student" &&
        (!isUasEmail(data.email) || !data.matricula || !data.career)
      )
        throw invalid(
          "Usa @uas.edu o @uas.edu.mx e ingresa matrícula y carrera.",
        )
      if (data.role === "company" && (!data.rfc || !data.giro || !data.address))
        throw invalid("Completa RFC, giro y dirección.")
      const career =
        data.role === "student"
          ? await prisma.career.findUnique({ where: { name: data.career } })
          : null
      if (data.role === "student" && !career)
        throw invalid("Selecciona una carrera válida.")
      return prisma.$transaction(async tx => {
        if(career) await selectCareers(tx,{ids:[career.id]});
        return tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, 12),
          roleId: data.role === "student" ? 1 : 2,
          ...(career
            ? {
                student: {
                  create: {
                    name: data.name,
                    matricula: data.matricula,
                    careerId: career.id,
                    phone: data.phone,
                  },
                },
              }
            : {
                company: {
                  create: {
                    name: data.name,
                    rfc: data.rfc,
                    giro: data.giro,
                    address: data.address,
                    phone: data.phone,
                  },
                },
              }),
        },
        include: userInclude,
      });
      });
    },
    async login(input) {
      const data = loginSchema.parse(input)
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: userInclude,
      })
      if (
        !user ||
        !user.active ||
        !(await bcrypt.compare(data.password, user.passwordHash))
      )
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "El correo o la contraseña no son correctos.",
        )
      return user
    },
    async createSession(userId) {
      const now = clock(),
        expiresAt = new Date(now.getTime() + 8 * 3600_000)
      const session = await prisma.session.create({
        data: { userId, expiresAt },
      })
      return {
        token: jwt.sign(
          {
            sid: session.id,
            sub: String(userId),
            iat: Math.floor(now.getTime() / 1000),
            exp: Math.floor(expiresAt.getTime() / 1000),
          },
          config.jwtSecret,
          { algorithm: "HS256" },
        ),
        expiresAt,
      }
    },
    async logout(sessionId) {
      await prisma.session.deleteMany({ where: { id: sessionId } })
    },
  }
}
