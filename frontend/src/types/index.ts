export type Role = 'student' | 'company' | 'admin'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type OpportunityStatus = 'draft' | 'open' | 'closed'
export type ApplicationStatus =
  'ENVIADA' | 'EN_REVISION' | 'ACEPTADA' | 'RECHAZADA'
export type VerificationResult =
  'success' | 'invalid' | 'expired' | 'already_verified'

export interface User {
  id: string
  role: Role
  name: string
  email: string
  emailVerified: boolean
  verificationEmailSent?: boolean
  registeredAt: string
  career?: string
  careerId?: string
  careerActive?: boolean
  matricula?: string
  university?: 'Universidad Autónoma de Sinaloa'
  phone?: string
  bio?: string
  rfc?: string
  contact?: string
  giro?: string
  address?: string
  agreementStartDate?: string | null
  agreementEndDate?: string | null
  approvalStatus?: ApprovalStatus
  rejectionReason?: string
  resolvedAt?: string
  resolvedBy?: string
  photo?: string
  logo?: string
  cvName?: string
  cvUpdatedAt?: string
  cvUrl?: string
}

export interface Opportunity {
  companyLogo?: string
  agreementStartDate?: string | null
  agreementEndDate?: string | null
  id: string
  companyId: string
  company: string
  title: string
  description: string
  area: string
  slots: number
  publishedAt: string
  contact?: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  careerIds: string[]
  careerRecordIds?: string[]
  careerAssociations?: CareerDto[]
  closingDate: string
  timezone: 'America/Mazatlan'
  status: OpportunityStatus
  applications: number
  initials: string
}

export interface Application {
  companyLogo?: string
  id: string
  opportunityId: string
  studentId: string
  opportunityTitle: string
  companyName: string
  opportunityStatus: OpportunityStatus
  date: string
  status: ApplicationStatus
}

export interface Candidate {
  photo?: string
  id: string
  applicationId: string
  name: string
  career: string
  date: string
  cvName: string
  cvUrl: string
  initials: string
  email: string
  phone?: string
  bio?: string
  status: ApplicationStatus
}

export interface CompanyReview extends User {
  agreementStartDate: string | null
  agreementEndDate: string | null
  approvalNotification?: ApprovalNotificationDto | null
  role: 'company'
  opportunityCount: number
}

export interface RegistrationInput {
  role: 'student' | 'company'
  name: string
  email: string
  password: string
  matricula?: string
  career?: string
  rfc?: string
  giro?: string
  address?: string
  phone?: string
}

export interface CareerDto {
  id: string
  name: string
  active: boolean
}

export interface AgreementDates {
  agreementStartDate: string | null
  agreementEndDate: string | null
}
export type AgreementStatus = 'none' | 'upcoming' | 'active' | 'expired'
export interface ApprovalNotificationDto {
  status: 'pending' | 'sending' | 'sent' | 'failed'
  sentAt: string | null
}
