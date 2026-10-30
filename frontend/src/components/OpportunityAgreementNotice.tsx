import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import useLocalCalendarDate from '../hooks/useLocalCalendarDate'
import { getAgreementStatus } from '../lib/agreements'
import { formatCalendarDate } from '../services/api'
import type { AgreementDates } from '../types'

export default function OpportunityAgreementNotice({
  dates,
}: {
  dates: AgreementDates
}) {
  const today = useLocalCalendarDate()
  const status = getAgreementStatus(dates, today)
  const active = status === 'active'
  const Icon = active ? CheckCircle2 : AlertTriangle
  const titles = {
    none: 'Empresa sin convenio con la UAS',
    active: 'Convenio activo con la UAS',
    expired: 'El convenio con la UAS ya venció',
    upcoming: 'El convenio con la UAS aún no inicia',
  }

  return (
    <div className="opportunity-agreement">
      <div className={`notice ${active ? 'success' : 'warning'}`}>
        <Icon aria-hidden="true" />
        <div>
          <strong>{titles[status]}</strong>
          {!active && (
            <p>
              Esta empresa no tiene un convenio activo. Si te postulas, debes
              comunicarle el proceso de convenio con la UAS.
            </p>
          )}
        </div>
      </div>
      {dates.agreementStartDate && dates.agreementEndDate && (
        <div className="opportunity-agreement-dates">
          <div>
            Inicio de convenio:{' '}
            <strong>{formatCalendarDate(dates.agreementStartDate)}</strong>
          </div>
          <div>
            Fin de convenio:{' '}
            <strong>{formatCalendarDate(dates.agreementEndDate)}</strong>
          </div>
        </div>
      )}
    </div>
  )
}
