import { useState } from "react";
import { useAuth } from "../app/AuthContext";
import { api, getErrorMessage } from "../services/api";
import type { CompanyReview } from "../types";
import { Button } from "./ui";

export default function ApprovalNotification({ company, onUpdate }: { company: CompanyReview; onUpdate: (company: CompanyReview) => void }) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const notification = company.approvalNotification;
  if (company.approvalStatus !== "approved" || !notification) return null;
  const messages = {
    sent: "Correo de aprobación enviado.",
    failed: "No se pudo enviar el correo de aprobación.",
    pending: "El correo de aprobación está pendiente.",
    sending: "El envío del correo está en proceso. Si se interrumpió, puedes reintentarlo después de un minuto.",
  };
  async function retry() {
    if (!user || sending) return;
    setSending(true); setError("");
    try { onUpdate(await api.retryApprovalNotification(company.id, user)); }
    catch (cause) { setError(getErrorMessage(cause, "No pudimos reintentar el correo.")); }
    finally { setSending(false); }
  }
  return <div className={`notice ${notification.status === "sent" ? "success" : "warning"}`} role="status">
    <p>{messages[notification.status]}</p>
    {notification.status !== "sent" && <Button variant="secondary" loading={sending} onClick={() => void retry()}>Reintentar correo</Button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
