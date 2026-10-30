import type { ReactNode } from "react"
import { Avatar, Badge, Title } from "./ui"
import { AgreementSummary } from "./AgreementBadge"
import { agreementDates } from "../lib/agreements"
import type { CompanyReview } from "../types"

export const approvalMeta = {
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobada", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
} as const

export default function CompanyDetails({
  company,
  agreementControl,
}: {
  company: CompanyReview
  agreementControl?: ReactNode
}) {
  return (
    <div className="admin-company-detail">
      <div className="candidate-profile-head">
        <Avatar
          size="large"
          src={company.logo}
          initials={company.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)}
        />
        <div>
          <Title as="h2">{company.name}</Title>
          <p>{company.giro}</p>
          <Badge tone={approvalMeta[company.approvalStatus || "pending"].tone}>
            {approvalMeta[company.approvalStatus || "pending"].label}
          </Badge>
        </div>
      </div>
      <div className="review-summary">
        <div>
          <span>RFC</span>
          <strong>{company.rfc}</strong>
        </div>
        <div>
          <span>Correo</span>
          <strong>{company.email}</strong>
        </div>
        <div>
          <span>Teléfono</span>
          <strong>{company.phone || "No registrado"}</strong>
        </div>
        <div>
          <span>Dirección</span>
          <strong>{company.address}</strong>
        </div>
        <div>
          <span>Correo verificado</span>
          <strong>{company.emailVerified ? "Sí" : "No"}</strong>
        </div>
        <div>
          <span>Fecha de registro</span>
          <strong>
            {new Date(company.registeredAt).toLocaleDateString("es-MX")}
          </strong>
        </div>
        <div>
          <span>Total de convocatorias</span>
          <strong>{company.opportunityCount}</strong>
        </div>
      </div>
      {agreementControl || <AgreementSummary dates={agreementDates(company)} />}
      {company.bio && (
        <div className="profile-summary">
          <Title as="h3">Descripción</Title>
          <p>{company.bio}</p>
        </div>
      )}
      {company.rejectionReason && (
        <div className="notice warning">
          <strong>Motivo del rechazo:</strong> {company.rejectionReason}
        </div>
      )}
    </div>
  )
}
