import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Clock3 } from "lucide-react"
import { useAuth } from "../../app/AuthContext"
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingState,
  Modal,
  QueryError,
  Textarea,
  Title,
} from "../../components/ui"
import CompanyDetails from "../../components/CompanyDetails"
import AgreementDatesFields from "../../components/AgreementDatesFields"
import { agreementDates, agreementDateError } from "../../lib/agreements"
import { api, getErrorMessage } from "../../services/api"
import type { AgreementDates, CompanyReview } from "../../types"

export default function AdminRequestsPage() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<CompanyReview[]>([])
  const [selected, setSelected] = useState<CompanyReview | null>(null)
  const [dates, setDates] = useState<AgreementDates>(agreementDates({}))
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [messageIsError, setMessageIsError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [queryError, setQueryError] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    setQueryError("")
    try {
      setCompanies(
        (await api.listCompanies()).filter(
          (company) => company.approvalStatus === "pending",
        ),
      )
    } catch (error) {
      setQueryError(
        getErrorMessage(error, "No pudimos cargar las solicitudes."),
      )
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  function open(company: CompanyReview) {
    setSelected(company)
    setDates(agreementDates(company))
    setMessage("")
    setMessageIsError(false)
    setReason("")
  }
  async function submit(resolve: boolean) {
    if (!selected || !user || saving) return
    const validation = agreementDateError(dates)
    if (validation) {
      setMessage(validation)
      setMessageIsError(true)
      return
    }
    setSaving(true)
    setMessage("")
    setMessageIsError(false)
    try {
      if (resolve && decision) {
        const updated = await api.resolveCompany(
          selected.id,
          decision,
          reason,
          user,
          dates,
        )
        setCompanies((current) =>
          current.filter((company) => company.id !== selected.id),
        )
        setMessage(
          `La solicitud fue ${
            decision === "approved" ? "aprobada" : "rechazada"
          } correctamente.${
            updated.approvalNotification?.status === "failed"
              ? " No pudimos enviar el correo; puedes reintentarlo desde el detalle de la empresa."
              : ""
          }`,
        )
        setDecision(null)
        setSelected(null)
        setReason("")
      } else {
        const updated = await api.setCompanyAgreement(selected.id, dates, user)
        setSelected(updated)
        setCompanies((current) =>
          current.map((company) =>
            company.id === updated.id ? updated : company,
          ),
        )
        setMessage(
          "El convenio se actualizó correctamente sin resolver la solicitud.",
        )
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "No pudimos guardar la solicitud."))
      setMessageIsError(true)
    } finally {
      setSaving(false)
    }
  }
  const notice = message ? (
    <div
      className={`notice ${messageIsError ? "warning" : "success"}`}
      role={messageIsError ? "alert" : "status"}
    >
      {message}
    </div>
  ) : null
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Revisión</span>
          <Title>Solicitudes pendientes</Title>
          <p>
            Revisa la información empresarial y captura las fechas de convenio
            únicamente si corresponden.
          </p>
        </div>
      </div>
      {!selected && notice}
      {loading ? (
        <LoadingState />
      ) : queryError ? (
        <QueryError message={queryError} onRetry={() => void load()} />
      ) : companies.length ? (
        <div className="candidate-grid">
          {companies.map((company) => (
            <Card className="candidate-card" key={company.id}>
              <div className="candidate-head">
                <Avatar
                  src={company.logo}
                  initials={company.name.slice(0, 2).toUpperCase()}
                />
                <div>
                  <Title as="h3">{company.name}</Title>
                  <p>{company.giro}</p>
                </div>
                <Badge tone="warning">Pendiente</Badge>
              </div>
              <div className="candidate-meta">
                <span>
                  <Clock3 />{" "}
                  {new Date(company.registeredAt).toLocaleDateString("es-MX")}
                </span>
                <span>
                  {company.emailVerified
                    ? "Correo verificado"
                    : "Correo sin verificar"}
                </span>
              </div>
              <Button variant="secondary" onClick={() => open(company)}>
                Abrir ficha de revisión
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircle2 />}
          title="No hay solicitudes pendientes"
          text="Las nuevas solicitudes empresariales aparecerán aquí."
        />
      )}
      <Modal
        open={!!selected && !decision}
        title="Ficha de revisión"
        busy={saving}
        onClose={() => setSelected(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setSelected(null)}
            >
              Cerrar
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void submit(false)}
            >
              Guardar convenio
            </Button>
            <Button
              variant="danger"
              disabled={saving || !selected?.emailVerified}
              onClick={() => {
                setMessage("")
                setDecision("rejected")
              }}
            >
              Rechazar
            </Button>
            <Button
              disabled={saving || !selected?.emailVerified}
              onClick={() => {
                setMessage("")
                setDecision("approved")
              }}
            >
              Aprobar
            </Button>
          </>
        }
      >
        {selected && (
          <>
            <CompanyDetails
              company={selected}
              agreementControl={
                <AgreementDatesFields
                  value={dates}
                  onChange={setDates}
                  disabled={saving}
                />
              }
            />
            {notice}
          </>
        )}
      </Modal>
      <Modal
        open={!!decision}
        title={decision === "approved" ? "Aprobar empresa" : "Rechazar empresa"}
        busy={saving}
        onClose={() => setDecision(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setDecision(null)}
            >
              Cancelar
            </Button>
            <Button
              variant={decision === "rejected" ? "danger" : "primary"}
              loading={saving}
              onClick={() => void submit(true)}
            >
              Confirmar {decision === "approved" ? "aprobación" : "rechazo"}
            </Button>
          </>
        }
      >
        {decision === "approved" ? (
          <p>
            ¿Confirmas que <strong>{selected?.name}</strong> puede acceder al
            panel empresarial? Las fechas opcionales de convenio se guardarán
            junto con la resolución.
          </p>
        ) : (
          <Field label="Motivo del rechazo">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </Field>
        )}
        {notice}
      </Modal>
    </div>
  )
}
