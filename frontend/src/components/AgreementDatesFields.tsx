import { Field, Input } from './ui'
import type { AgreementDates } from '../types'

interface Props {
  value: AgreementDates
  onChange: (value: AgreementDates) => void
  disabled?: boolean
  optionalHint?: boolean
}

export default function AgreementDatesFields({
  value,
  onChange,
  disabled,
  optionalHint = true,
}: Props) {
  return (
    <div className="agreement-date-fields">
      {optionalHint && (
        <p className="muted">
          Fechas de convenio opcionales: complétalas únicamente si la empresa ya
          cuenta con convenio.
        </p>
      )}
      <div className="form-grid">
        <Field label="Fecha inicial del convenio">
          <Input
            type="date"
            value={value.agreementStartDate || ''}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                agreementStartDate: event.target.value || null,
              })
            }
          />
        </Field>
        <Field label="Fecha final del convenio">
          <Input
            type="date"
            value={value.agreementEndDate || ''}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                agreementEndDate: event.target.value || null,
              })
            }
          />
        </Field>
      </div>
    </div>
  )
}
