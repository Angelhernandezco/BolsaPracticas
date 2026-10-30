import { selectCareers } from '../careers/service.js'
import { z } from 'zod'
import { invalid, forbidden, notFound } from '../../lib/errors.js'
import {
  effectiveStatus,
  mazatlanDate,
  parseCalendarDate,
} from '../../lib/dates.js'
import { serializeOpportunity, opportunityInclude } from './serializers.js'
const optionalText = (max) => z.string().trim().max(max).optional()
const schema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(150),
  description: optionalText(30000),
  area: optionalText(120),
  slots: z.number().int().min(0).max(100000).optional(),
  contactName: optionalText(100),
  contactEmail: optionalText(150),
  contactPhone: z.string().max(30).nullish(),
  careerIds: z.array(z.string().max(120)).max(50).optional(),
  careerRecordIds: z
    .array(z.string().regex(/^[1-9]\d*$/))
    .max(50)
    .optional(),
  closingDate: optionalText(10),
  intent: z.enum(['draft', 'publish', 'save']).default('publish'),
})
export async function lockOpportunity(tx, id) {
  await tx.$queryRaw`SELECT id_convocatoria FROM convocatoria WHERE id_convocatoria=${id} FOR UPDATE`
  const o = await tx.opportunity.findUnique({
    where: { id },
    include: opportunityInclude,
  })
  if (!o) throw notFound()
  return o
}
export function checkOwner(o, user) {
  if (o.companyId !== user.company?.id) throw forbidden()
}
export function opportunitiesService({ prisma, clock }) {
  return {
    async list(user, all) {
      const where =
        user.roleId === 2
          ? { companyId: user.company.id }
          : {
              status: { not: 'BORRADOR' },
              company: { approvalStatus: 'approved', user: { active: true } },
            }
      const rows = await prisma.opportunity.findMany({
        where,
        include: opportunityInclude,
        orderBy: { id: 'desc' },
      })
      return rows
        .map((o) => serializeOpportunity(o, clock()))
        .filter((o) => all || o.status === 'open')
    },
    async get(user, id) {
      const o = await prisma.opportunity.findUnique({
        where: { id },
        include: opportunityInclude,
      })
      if (!o) throw notFound()
      if (user.roleId === 2) checkOwner(o, user)
      else if (o.status === 'BORRADOR') throw forbidden()
      return serializeOpportunity(o, clock())
    },
    async save(user, id, input) {
      const data = schema.parse(input)
      return prisma.$transaction(async (tx) => {
        const previous = id ? await lockOpportunity(tx, id) : null
        if (previous) checkOwner(previous, user)
        if (
          previous &&
          previous.status !== 'BORRADOR' &&
          data.intent === 'draft'
        )
          throw invalid(
            'Una convocatoria publicada no puede volver a borrador.',
          )
        const merged = {
          description: '',
          area: '',
          slots: 0,
          contactName: '',
          contactEmail: '',
          contactPhone: null,
          careerIds: [],
          closingDate: '',
          ...(previous ? serializeOpportunity(previous, clock()) : {}),
          ...data,
        }
        const careers = await selectCareers(tx, {
          ids:
            data.careerRecordIds ??
            (data.careerIds === undefined && previous
              ? previous.careers.map((row) => row.careerId)
              : undefined),
          names: merged.careerIds,
          existingIds: previous?.careers.map((row) => row.careerId) || [],
        })
        const closingDate = merged.closingDate
          ? parseCalendarDate(merged.closingDate)
          : null
        if (data.intent !== 'draft') {
          if (
            !merged.description ||
            !merged.area ||
            !merged.contactName ||
            !z.string().email().safeParse(merged.contactEmail).success ||
            merged.slots < 1 ||
            !careers.length ||
            !closingDate
          )
            throw invalid(
              'Completa todos los campos obligatorios antes de publicar.',
            )
          if (merged.closingDate < mazatlanDate(clock()))
            throw invalid('La fecha de cierre debe ser hoy o posterior.')
        }
        const status =
          data.intent === 'draft'
            ? 'BORRADOR'
            : data.intent === 'publish'
              ? 'ABIERTA'
              : previous
                ? effectiveStatus(previous, clock()) === 'closed'
                  ? 'CERRADA'
                  : previous.status
                : 'ABIERTA'
        const values = {
          title: data.title,
          description: merged.description,
          area: merged.area,
          slots: merged.slots,
          contactName: merged.contactName,
          contactEmail: merged.contactEmail,
          contactPhone: merged.contactPhone,
          status,
          closingDate,
          publishedAt:
            previous?.publishedAt || (status === 'ABIERTA' ? clock() : null),
        }
        if (previous)
          await tx.opportunityCareer.deleteMany({
            where: { opportunityId: id },
          })
        const o = await tx.opportunity[previous ? 'update' : 'create']({
          ...(previous ? { where: { id } } : {}),
          data: {
            ...values,
            ...(!previous ? { companyId: user.company.id } : {}),
            careers: { create: careers.map((c) => ({ careerId: c.id })) },
          },
          include: opportunityInclude,
        })
        return serializeOpportunity(o, clock())
      })
    },
    async change(user, id, action) {
      return prisma.$transaction(async (tx) => {
        const o = await lockOpportunity(tx, id)
        checkOwner(o, user)
        if (o.status === 'BORRADOR')
          throw invalid('Publica el borrador antes de cambiar su estado.')
        if (
          action === 'reactivate' &&
          (!o.closingDate ||
            o.closingDate.toISOString().slice(0, 10) < mazatlanDate(clock()))
        )
          throw invalid('Edita la fecha de cierre antes de reactivar.')
        return serializeOpportunity(
          await tx.opportunity.update({
            where: { id },
            data: {
              status: action === 'close' ? 'CERRADA' : 'ABIERTA',
              closedAt: action === 'close' ? clock() : null,
            },
            include: opportunityInclude,
          }),
          clock(),
        )
      })
    },
  }
}
