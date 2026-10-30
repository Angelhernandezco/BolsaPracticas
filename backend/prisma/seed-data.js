import { readFileSync } from "node:fs"

export function loadSeedData() {
  return JSON.parse(
    readFileSync(
      new URL("../../fixtures/seed-data.json", import.meta.url),
      "utf8",
    ),
  )
}

export function dateOffset(referenceDate, days) {
  const date = new Date(`${referenceDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const ref = (key) => ({ $ref: key })
const timestamp = (date) => new Date(`${date.slice(0, 10)}T12:00:00Z`)
const roleIds = { student: 1, company: 2, admin: 3 }
const opportunityStates = {
  open: "ABIERTA",
  closed: "CERRADA",
  draft: "BORRADOR",
}

// Flat, ordered records are shared by the ORM and SQL writers. References use
// semantic keys; generated database IDs are never assumed by the ORM writer.
export function seedRecords(
  manifest,
  { referenceDate = manifest.referenceDate } = {},
) {
  const records = []
  const add = (model, key, data) =>
    records.push({ model, key: `${model}:${key}`, data })
  for (const role of manifest.roles) add("Role", role.id, role)
  for (const career of manifest.careers)
    add("Career", career.key, {
      name: career.name,
      seedKey: career.key,
      active: career.active,
    })
  for (const user of manifest.users) {
    add("User", user.id, {
      email: user.email,
      name: user.name,
      roleId: roleIds[user.role],
      emailVerified: user.emailVerified,
      registeredAt: timestamp(user.registeredAt),
      passwordHash: manifest.passwords[user.passwordKey].hash,
    })
  }
  for (const user of manifest.users.filter((item) => item.fileKey)) {
    add("StoredFile", user.id, {
      id: user.fileKey,
      ownerId: ref(`User:${user.id}`),
      driver: "local",
      key: user.fileKey,
      name: user.cvName,
      mime: "application/pdf",
      size: readFileSync(
        new URL("../../frontend/public/demo-cv.pdf", import.meta.url),
      ).length,
      purpose: "cv",
    })
  }
  for (const user of manifest.users) {
    if (user.role === "student") {
      const career = manifest.careers.find((item) => item.name === user.career)
      add("Student", user.id, {
        userId: ref(`User:${user.id}`),
        careerId: ref(`Career:${career.key}`),
        name: user.name,
        matricula: user.matricula,
        phone: user.phone || null,
        bio: user.bio || null,
        ...(user.fileKey
          ? {
              cvId: ref(`StoredFile:${user.id}`),
              cvUpdatedAt: timestamp(user.cvUpdatedAt || referenceDate),
            }
          : {}),
      })
    }
    if (user.role === "company") {
      const dates = user.agreementOffsets?.map(
        (offset) => new Date(`${dateOffset(referenceDate, offset)}T00:00:00Z`),
      ) || [null, null]
      add("Company", user.id, {
        userId: ref(`User:${user.id}`),
        name: user.name,
        rfc: user.rfc,
        giro: user.giro,
        address: user.address,
        phone: user.phone || null,
        bio: user.bio || null,
        contact: user.contact || null,
        approvalStatus: user.approvalStatus,
        rejectionReason: user.rejectionReason || null,
        agreementStartDate: dates[0],
        agreementEndDate: dates[1],
      })
    }
  }
  for (const item of manifest.opportunities) {
    const closing = item.closingDate.startsWith("offset:")
      ? dateOffset(referenceDate, Number(item.closingDate.slice(7)))
      : item.closingDate
    add("Opportunity", item.id, {
      companyId: ref(`Company:${item.companyId}`),
      title: item.title,
      description: item.description,
      area: item.area,
      slots: item.slots,
      contactName: item.contactName,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone || null,
      status: opportunityStates[item.status],
      closingDate: closing ? new Date(`${closing}T00:00:00Z`) : null,
      publishedAt: item.publishedAt ? timestamp(item.publishedAt) : null,
    })
    for (const name of item.careerIds) {
      const career = manifest.careers.find((row) => row.name === name)
      add("OpportunityCareer", `${item.id}:${career.key}`, {
        opportunityId: ref(`Opportunity:${item.id}`),
        careerId: ref(`Career:${career.key}`),
      })
    }
  }
  for (const item of manifest.applications) {
    add("Application", item.id, {
      opportunityId: ref(`Opportunity:${item.opportunityId}`),
      studentId: ref(`Student:${item.studentId}`),
      cvId: ref(`StoredFile:${item.studentId}`),
      opportunityTitle: item.opportunityTitle,
      companyName: item.companyName,
      status: item.status,
      date: timestamp(item.date),
    })
  }
  return records
}

export function resolveSeedData(data, ids) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value?.$ref ? ids.get(value.$ref) : value,
    ]),
  )
}

export async function seedCatalogs(prisma, manifest = loadSeedData()) {
  for (const role of manifest.roles)
    await prisma.role.upsert({
      where: { id: role.id },
      create: role,
      update: {},
    })
  for (const career of manifest.careers)
    await prisma.career.upsert({
      where: { seedKey: career.key },
      create: { name: career.name, seedKey: career.key, active: career.active },
      update: {},
    })
}

export async function seedDemo(
  prisma,
  manifest = loadSeedData(),
  options = {},
) {
  return prisma.$transaction(
    async (tx) => {
      // Reserved emails are a boundary: never attach demo records to real accounts.
      if (
        await tx.user.count({
          where: { email: { in: manifest.users.map((user) => user.email) } },
        })
      )
        return { created: false }
      const ids = new Map(
        (await tx.career.findMany())
          .filter((career) => career.seedKey)
          .map((career) => [`Career:${career.seedKey}`, career.id]),
      )
      for (const record of seedRecords(manifest, options).filter(
        (record) => !["Role", "Career"].includes(record.model),
      )) {
        const delegate = record.model[0].toLowerCase() + record.model.slice(1)
        const result = await tx[delegate].create({
          data: resolveSeedData(record.data, ids),
        })
        ids.set(record.key, result.id)
      }
      return { created: true }
    },
    { timeout: 20000 },
  )
}
