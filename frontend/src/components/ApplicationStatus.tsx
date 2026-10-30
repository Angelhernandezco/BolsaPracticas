import { Badge } from './ui'
import type { ApplicationStatus } from '../types'

export const applicationStatusMeta: Record<
  ApplicationStatus,
  {
    label: string
    tone: 'info' | 'warning' | 'success' | 'danger'
    title: string
    message: string
  }
> = {
  ENVIADA: {
    label: 'Enviada',
    tone: 'info',
    title: 'Tu postulación fue enviada',
    message:
      'La empresa recibió tu perfil y currículum. Te avisaremos cuando haya una actualización.',
  },
  EN_REVISION: {
    label: 'En revisión',
    tone: 'warning',
    title: 'La empresa está revisando tu perfil',
    message:
      'Tu postulación se encuentra en evaluación. Mantén actualizados tus datos de contacto.',
  },
  ACEPTADA: {
    label: 'Aceptada',
    tone: 'success',
    title: '¡Felicidades! Tu postulación fue aceptada',
    message:
      'La empresa seleccionó tu perfil. Revisa tus datos de contacto para continuar con el proceso.',
  },
  RECHAZADA: {
    label: 'No seleccionada',
    tone: 'danger',
    title: 'La empresa continuó con otros perfiles',
    message:
      'Esta vez tu postulación no fue seleccionada. Puedes seguir explorando nuevas oportunidades.',
  },
}

export default function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus
}) {
  const meta = applicationStatusMeta[status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
