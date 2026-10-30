import { PrismaClient } from "@prisma/client"

import bcrypt from "bcrypt"

import { readFile } from "node:fs/promises"

import { seed } from "./seed.js"

import { loadConfig } from "../src/config.js"

import { userInclude } from "../src/lib/serializers.js"

import { filesService } from "../src/modules/files/service.js"

import { createStorage } from "../src/services/storage/index.js"

if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_DEMO_SEED !== "true"
)
  throw new Error(
    "Semilla demo deshabilitada. Habilita ALLOW_DEMO_SEED solo en desarrollo.",
  )

const prisma = new PrismaClient(),
  config = loadConfig(),
  clock = () => new Date()

try {
  await seed(prisma)

  const career = await prisma.career.findUniqueOrThrow({
      where: { name: "Ingeniería en Software" },
    }),
    hash = await bcrypt.hash("Demo1234", 12)

  const demos = [
    ["mariana.lopez@uas.edu", "Mariana López", 1, true, null],

    ["diego.ramirez@uas.edu", "Diego Ramírez", 1, false, null],

    ["empresa@demo.mx", "Nébula Digital", 2, true, "approved"],

    [
      "empresa.sinverificar@demo.mx",

      "Servicios del Pacífico",

      2,

      false,

      "pending",
    ],

    ["pendiente@demo.mx", "Constructora Delta", 2, true, "pending"],

    ["rechazada@demo.mx", "Comercial Nova", 2, true, "rejected"],

    ["admin@demo.mx", "Administrador de demostración", 3, true, null],
  ]

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.count({
      where: { email: { in: demos.map((row) => row[0]) } },
    })

    if (existing) return false

    for (const [
      index,

      [email, name, roleId, emailVerified, approvalStatus],
    ] of demos.entries())
      await tx.user.create({
        data: {
          email,

          name,

          roleId,

          emailVerified,

          passwordHash: hash,

          ...(roleId === 1
            ? {
                student: {
                  create: {
                    name,

                    matricula: `DEMO2026${index}`,

                    careerId: career.id,
                  },
                },
              }
            : roleId === 2
              ? {
                  company: {
                    create: {
                      name,

                      rfc: `DEM210101A${String(index).padStart(2, "0")}`,

                      giro: "Servicios profesionales",

                      address: "Los Mochis, Sinaloa",

                      approvalStatus,

                      agreementStartDate: index === 2 ? new Date("2026-01-01") : null,
                      agreementEndDate: index === 2 ? new Date("2027-12-31") : null,

                      rejectionReason:
                        approvalStatus === "rejected"
                          ? "Información incompleta en la solicitud."
                          : null,
                    },
                  },
                }
              : {}),
        },
      })

    return true
  })

  if (!created) {
    console.log(
      "Semilla demo omitida: ya existen cuentas con correos reservados; no se modificaron perfiles, CV ni relaciones.",
    )
  } else {
    let student = await prisma.user.findUniqueOrThrow({
      where: { email: "mariana.lopez@uas.edu" },

      include: userInclude,
    })

    if (!student.student.cvId)
      await filesService({
        prisma,

        config,

        storage: createStorage(config),

        clock,
      }).upload(
        student,

        {
          buffer: await readFile(
            new URL("../../frontend/public/demo-cv.pdf", import.meta.url),
          ),

          originalname: "CV_Mariana_Lopez.pdf",
        },

        "cv",
      )

    student = await prisma.user.findUniqueOrThrow({
      where: { id: student.id },

      include: userInclude,
    })

    const company = await prisma.company.findUniqueOrThrow({
      where: {
        userId: (
          await prisma.user.findUniqueOrThrow({
            where: { email: "empresa@demo.mx" },
          })
        ).id,
      },
    })

    const closingDate = new Date()

    closingDate.setUTCDate(closingDate.getUTCDate() + 30)

    for (const [title, status] of [
      ["Practicante de Desarrollo Frontend", "ABIERTA"],

      ["Practicante de QA y Automatización", "CERRADA"],

      ["Prácticas de soporte técnico", "BORRADOR"],
    ]) {
      let o = await prisma.opportunity.findFirst({
        where: { companyId: company.id, title },
      })

      if (!o)
        o = await prisma.opportunity.create({
          data: {
            companyId: company.id,

            title,

            status,

            description:
              status === "BORRADOR"
                ? ""
                : "Colabora en desarrollo de productos digitales con un equipo profesional.",

            area: "Tecnologías de la información",

            slots: 2,

            contactName: "Equipo de talento",

            contactEmail: "empresa@demo.mx",

            closingDate,

            publishedAt: status === "BORRADOR" ? null : new Date(),

            careers: { create: { careerId: career.id } },
          },
        })

      if (status === "CERRADA")
        await prisma.application.upsert({
          where: {
            opportunityId_studentId: {
              opportunityId: o.id,

              studentId: student.student.id,
            },
          },

          update: {},

          create: {
            opportunityId: o.id,

            studentId: student.student.id,

            cvId: student.student.cvId,

            opportunityTitle: title,

            companyName: company.name,

            status: "EN_REVISION",
          },
        })
    }

    console.log(
      "Datos de demostración locales preparados; las cuentas existentes se conservaron.",
    )
  }
} finally {
  await prisma.$disconnect()
}
