import { Badge } from "./ui"
import { getAgreementStatus } from "../lib/agreements"
import useLocalCalendarDate from "../hooks/useLocalCalendarDate"
import { formatCalendarDate } from "../services/api"
import type { AgreementDates } from "../types"

export default function AgreementBadge({
  dates,
  today,
}: {
  dates: AgreementDates
  today: string
}) {
  const status = getAgreementStatus(dates, today)
  const labels = {
    none: "Sin convenio",
    upcoming: "Próximo a iniciar",
    active: "Activo",
    expired: "Vencido",
  }
  const tones = {
    none: "neutral",
    upcoming: "info",
    active: "success",
    expired: "warning",
  } as const
  return <Badge tone={tones[status]}>{labels[status]}</Badge>
}

export function AgreementSummary({ dates }: { dates: AgreementDates }) {
  const today = useLocalCalendarDate()
  const status = getAgreementStatus(dates, today)
  return (
    <div className="agreement-summary">
      <div className="readonly-agreement">
        <span>Convenio con la UAS</span>
        <AgreementBadge dates={dates} today={today} />
      </div>
      {(dates.agreementStartDate || dates.agreementEndDate) && (
        <div className="review-summary">
          <div>
            <span>Inicio de convenio</span>
            <strong>
              {dates.agreementStartDate
                ? formatCalendarDate(dates.agreementStartDate)
                : "—"}
            </strong>
          </div>
          <div>
            <span>Fin de convenio</span>
            <strong>
              {dates.agreementEndDate
                ? formatCalendarDate(dates.agreementEndDate)
                : "—"}
            </strong>
          </div>
        </div>
      )}
      {status === "expired" && (
        <div className="notice warning">El convenio con la UAS ya venció.</div>
      )}
      {status === "upcoming" && (
        <div className="notice info">El convenio con la UAS aún no inicia.</div>
      )}
    </div>
  )
}
