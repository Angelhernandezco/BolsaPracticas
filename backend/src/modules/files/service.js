import { randomUUID } from "node:crypto"
import { AppError, invalid, forbidden, notFound } from "../../lib/errors.js"
import { serializeUser, userInclude } from "../../lib/serializers.js"
export function filesService({ prisma, config, storage, clock }) {
  return {
    async upload(user, file, purpose) {
      if (!file) throw invalid("Selecciona un archivo.")
      const b = file.buffer
      const isPdf =
        b.subarray(0, 5).toString() === "%PDF-" &&
        b.subarray(-1024).includes(Buffer.from("%%EOF"))
      const isPng = b
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      const isJpg =
        b[0] === 255 &&
        b[1] === 216 &&
        b[2] === 255 &&
        b[b.length - 2] === 255 &&
        b[b.length - 1] === 217
      if (purpose === "cv" ? !isPdf : !(isPng || isJpg))
        throw invalid(
          purpose === "cv"
            ? "El archivo debe ser un PDF válido."
            : "Selecciona una imagen JPG o PNG válida.",
        )
      const limit = purpose === "cv" ? 5_000_000 : 2_000_000
      if (b.length > limit)
        throw new AppError(
          413,
          "FILE_SIZE",
          "El archivo excede el tamaño permitido.",
        )
      const key = randomUUID(),
        driver = config.storageDriver,
        mime =
          purpose === "cv"
            ? "application/pdf"
            : isPng
              ? "image/png"
              : "image/jpeg"
      await storage.put({ driver, key, buffer: b, contentType: mime })
      try {
        await prisma.$transaction(async (tx) => {
          const record = await tx.storedFile.create({
            data: {
              ownerId: user.id,
              key,
              driver,
              mime,
              size: b.length,
              purpose,
              name: file.originalname.replace(/[\r\n\\/]/g, "_").slice(0, 200),
            },
          })
          if (user.roleId === 1)
            await tx.student.update({
              where: { userId: user.id },
              data:
                purpose === "cv"
                  ? { cvId: record.id, cvUpdatedAt: clock() }
                  : { photoId: record.id },
            })
          else
            await tx.company.update({
              where: { userId: user.id },
              data: { logoId: record.id },
            })
        })
      } catch (error) {
        await storage.delete({ driver, key }).catch(() => {})
        throw error
      }
      return serializeUser(
        await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          include: userInclude,
        }),
      )
    },
    async read(user, id) {
      const file = await prisma.storedFile.findUnique({ where: { id } })
      if (!file) throw notFound()
      let allowed = file.ownerId === user.id
      if (file.purpose === "cv") {
        if (user.roleId === 3) allowed = false
        if (user.roleId === 2 && user.company?.approvalStatus === "approved")
          allowed = !!(await prisma.application.findFirst({
            where: { cvId: id, opportunity: { companyId: user.company.id } },
          }))
      } else if (
        file.purpose === "logo" &&
        (user.roleId === 1 || user.roleId === 3)
      ) {
        allowed = !!(await prisma.company.findFirst({
          where: {
            logoId: id,
            ...(user.roleId === 1 ? { approvalStatus: "approved" } : {}),
          },
        }))
      } else if (
        file.purpose === "photo" &&
        user.roleId === 2 &&
        user.company?.approvalStatus === "approved"
      ) {
        allowed = !!(await prisma.application.findFirst({
          where: {
            student: { photoId: id },
            opportunity: { companyId: user.company.id },
          },
        }))
      }
      if (!allowed) throw forbidden()
      return {
        file,
        ...(await storage.get({ driver: file.driver, key: file.key })),
      }
    },
  }
}
