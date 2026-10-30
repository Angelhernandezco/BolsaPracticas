export type Role = "student" | "company";
export type OpportunityStatus = "active" | "closed";
export type ApplicationStatus = "ENVIADA" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA";

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  career?: string;
  phone?: string;
  bio?: string;
  rfc?: string;
  contact?: string;
  photo?: string;
  logo?: string;
  cvName?: string;
  cvUpdatedAt?: string;
  cvUrl?: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  company: string;
  title: string;
  description: string;
  area: string;
  slots: number;
  publishedAt: string;
  contact: string;
  status: OpportunityStatus;
  applications: number;
  initials: string;
}

export interface Application {
  id: string;
  opportunityId: string;
  studentId: string;
  date: string;
  status: ApplicationStatus;
}

export interface Candidate {
  id: string;
  applicationId: string;
  name: string;
  career: string;
  date: string;
  cvName: string;
  initials: string;
  email: string;
  phone?: string;
  bio?: string;
  status: ApplicationStatus;
}
