import { z } from 'zod'
import { parseCalendarDate } from './dates.js'
export function validateAgreementDates(input) {
  const value = z
    .object({
      agreementStartDate: z.string().nullable(),
      agreementEndDate: z.string().nullable(),
    })
    .strict()
    .parse(input)
  if ((value.agreementStartDate === null) !== (value.agreementEndDate === null))
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: 'Completa ambas fechas o deja ambas vacías.',
      },
    ])
  const agreementStartDate =
    value.agreementStartDate === null
      ? null
      : parseCalendarDate(value.agreementStartDate)
  const agreementEndDate =
    value.agreementEndDate === null
      ? null
      : parseCalendarDate(value.agreementEndDate)
  if (agreementStartDate && agreementEndDate < agreementStartDate)
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: 'La fecha final debe ser igual o posterior a la inicial.',
      },
    ])
  return { agreementStartDate, agreementEndDate }
}
export function agreementStatusOn(dates, today) {
  const start = dates.agreementStartDate?.toISOString().slice(0, 10),
    end = dates.agreementEndDate?.toISOString().slice(0, 10)
  return !start || !end
    ? 'none'
    : today < start
      ? 'upcoming'
      : today > end
        ? 'expired'
        : 'active'
}
