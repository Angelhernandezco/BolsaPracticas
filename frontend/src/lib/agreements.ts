import type { AgreementDates, AgreementStatus } from '../types'

export function localCalendarDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getAgreementStatus(
  dates: AgreementDates,
  today: string,
): AgreementStatus {
  if (!dates.agreementStartDate || !dates.agreementEndDate) return 'none'
  if (today < dates.agreementStartDate) return 'upcoming'
  if (today > dates.agreementEndDate) return 'expired'
  return 'active'
}

export function agreementDateError(dates: AgreementDates): string {
  if (!!dates.agreementStartDate !== !!dates.agreementEndDate)
    return 'Completa ambas fechas o deja ambas vacías.'
  if (
    dates.agreementStartDate &&
    dates.agreementEndDate &&
    dates.agreementEndDate < dates.agreementStartDate
  )
    return 'La fecha final debe ser igual o posterior a la inicial.'
  return ''
}

export function agreementDates(value: Partial<AgreementDates>): AgreementDates {
  return {
    agreementStartDate: value.agreementStartDate || null,
    agreementEndDate: value.agreementEndDate || null,
  }
}
