import type { Application, Candidate, Opportunity, Role, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "";
const USE_DEMO = import.meta.env.VITE_USE_MOCKS === "true" || !API_URL;
const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

const opportunities: Opportunity[] = [
  { id: "op-1", companyId: "company-1", company: "Nébula Digital", title: "Practicante de Desarrollo Frontend", description: "Participa en el diseño y desarrollo de experiencias web para productos digitales. Trabajarás con React, TypeScript y un equipo multidisciplinario mediante revisiones de código y sesiones de aprendizaje.", area: "Tecnologías de la información", slots: 3, publishedAt: "2026-10-04", contact: "talento@nebuladigital.mx", status: "active", applications: 8, initials: "ND" },
  { id: "op-2", companyId: "company-2", company: "AgroNova", title: "Analista de Datos Jr.", description: "Apoya al equipo de inteligencia de negocio en la limpieza, análisis y visualización de datos para optimizar operaciones agrícolas.", area: "Ciencia de datos", slots: 2, publishedAt: "2026-10-02", contact: "personas@agronova.mx", status: "active", applications: 5, initials: "AN" },
  { id: "op-3", companyId: "company-3", company: "Estudio Norte", title: "Prácticas de Diseño de Producto", description: "Colabora en investigación de usuarios, prototipos y sistemas de diseño para servicios digitales centrados en las personas.", area: "Diseño", slots: 1, publishedAt: "2026-09-29", contact: "hola@estudionorte.mx", status: "active", applications: 12, initials: "EN" },
  { id: "op-4", companyId: "company-1", company: "Nébula Digital", title: "Practicante de QA y Automatización", description: "Diseña pruebas y apoya la automatización de flujos críticos para productos web.", area: "Tecnologías de la información", slots: 2, publishedAt: "2026-09-24", contact: "talento@nebuladigital.mx", status: "active", applications: 4, initials: "ND" },
  { id: "op-5", companyId: "company-1", company: "Nébula Digital", title: "Soporte de infraestructura cloud", description: "Apoyo al equipo de operaciones en documentación y monitoreo de servicios.", area: "Infraestructura", slots: 0, publishedAt: "2026-08-15", contact: "talento@nebuladigital.mx", status: "closed", applications: 9, initials: "ND" },
];

let applications: Application[] = [
  { id: "app-1", opportunityId: "op-2", studentId: "student-1", date: "2026-10-03", status: "EN_REVISION" },
  { id: "app-2", opportunityId: "op-3", studentId: "student-1", date: "2026-10-01", status: "ACEPTADA" },
  { id: "app-3", opportunityId: "op-1", studentId: "student-1", date: "2026-10-05", status: "ENVIADA" },
  { id: "app-4", opportunityId: "op-1", studentId: "student-2", date: "2026-10-02", status: "EN_REVISION" },
  { id: "app-5", opportunityId: "op-1", studentId: "student-3", date: "2026-09-30", status: "RECHAZADA" },
];

const users: User[] = [
  { id: "student-1", role: "student", name: "Mariana López", email: "mariana.lopez@uas.edu.mx", career: "Ingeniería en Software", phone: "668 123 4567", bio: "Estudiante interesada en desarrollo frontend y productos digitales.", cvName: "CV_Mariana_Lopez.pdf", cvUpdatedAt: "2026-10-01", cvUrl: "/demo-cv.pdf" },
  { id: "company-1", role: "company", name: "Nébula Digital", email: "empresa@demo.mx", rfc: "NDI210315AB1", contact: "talento@nebuladigital.mx", phone: "668 246 8024", bio: "Creamos productos digitales útiles para organizaciones en crecimiento." },
];

const getStoredUser = () => {
  const raw = localStorage.getItem("bolsa-session");
  return raw ? (JSON.parse(raw) as User) : null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (response.status === 401) localStorage.removeItem("bolsa-session");
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "No fue posible completar la solicitud.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  mode: USE_DEMO ? "demo" : "api",
  async getSession() {
    if (!USE_DEMO) return request<User | null>("/auth/session");
    await wait(120);
    let user = getStoredUser();
    if (user?.role === "student" && !user.email.toLowerCase().endsWith("@uas.edu.mx")) {
      localStorage.removeItem("bolsa-session");
      return null;
    }
    if (user?.role === "student" && (!user.cvUrl || user.cvUrl.startsWith("blob:"))) {
      const demoUser = users.find((item) => item.id === user?.id);
      user = { ...user, cvUrl: demoUser?.cvUrl };
      localStorage.setItem("bolsa-session", JSON.stringify(user));
    }
    return user;
  },
  async login(email: string, password: string) {
    if (!USE_DEMO) return request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await wait();
    const user = users.find((item) => item.email === email);
    if (!user || password !== "Demo1234") throw new Error("El correo o la contraseña no son correctos.");
    if (user.role === "student" && !user.email.toLowerCase().endsWith("@uas.edu.mx")) {
      throw new Error("Los estudiantes deben ingresar con un correo institucional autorizado.");
    }
    localStorage.setItem("bolsa-session", JSON.stringify(user));
    return user;
  },
  async register(input: { name: string; email: string; password: string; role: Role; rfc?: string }) {
    if (!USE_DEMO) return request<User>("/auth/register", { method: "POST", body: JSON.stringify(input) });
    await wait();
    if (input.role === "student" && !input.email.toLowerCase().endsWith("@uas.edu.mx")) {
      throw new Error("Utiliza un correo institucional autorizado con dominio @uas.edu.mx.");
    }
    const user: User = { id: `${input.role}-${Date.now()}`, role: input.role, name: input.name, email: input.email, rfc: input.rfc };
    users.push(user);
    localStorage.setItem("bolsa-session", JSON.stringify(user));
    return user;
  },
  async logout() {
    if (!USE_DEMO) await request("/auth/logout", { method: "POST" });
    localStorage.removeItem("bolsa-session");
  },
  async listOpportunities(includeClosed = false) {
    if (!USE_DEMO) return request<Opportunity[]>(`/opportunities${includeClosed ? "?all=true" : ""}`);
    await wait();
    return opportunities.filter((item) => includeClosed || item.status === "active");
  },
  async getOpportunity(id: string) {
    if (!USE_DEMO) return request<Opportunity>(`/opportunities/${id}`);
    await wait(100);
    const item = opportunities.find((opportunity) => opportunity.id === id);
    if (!item) throw new Error("La convocatoria no existe.");
    return item;
  },
  async getApplications(studentId: string) {
    if (!USE_DEMO) return request<Application[]>("/applications/me");
    await wait();
    return applications.filter((item) => item.studentId === studentId);
  },
  async apply(opportunityId: string, studentId: string) {
    if (!USE_DEMO) return request<Application>("/applications", { method: "POST", body: JSON.stringify({ opportunityId }) });
    await wait();
    if (applications.some((item) => item.opportunityId === opportunityId && item.studentId === studentId)) throw new Error("Ya tienes una postulación registrada para esta convocatoria.");
    const application: Application = { id: `app-${Date.now()}`, opportunityId, studentId, date: new Date().toISOString().slice(0, 10), status: "ENVIADA" };
    applications = [application, ...applications];
    return application;
  },
  async updateProfile(user: User) {
    if (!USE_DEMO) return request<User>(`/${user.role}s/profile`, { method: "PUT", body: JSON.stringify(user) });
    await wait();
    const index = users.findIndex((item) => item.id === user.id);
    if (index >= 0) users[index] = user;
    localStorage.setItem("bolsa-session", JSON.stringify(user));
    return user;
  },
  async saveOpportunity(input: Partial<Opportunity>, company: User) {
    if (!USE_DEMO) return request<Opportunity>(`/company/opportunities${input.id ? `/${input.id}` : ""}`, { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) });
    await wait();
    if (input.id) {
      const index = opportunities.findIndex((item) => item.id === input.id && item.companyId === company.id);
      if (index < 0) throw new Error("No tienes permiso para editar esta convocatoria.");
      opportunities[index] = { ...opportunities[index], ...input } as Opportunity;
      return opportunities[index];
    }
    const item: Opportunity = { id: `op-${Date.now()}`, companyId: company.id, company: company.name, title: input.title!, description: input.description!, area: input.area!, slots: Number(input.slots), contact: input.contact!, status: "active", publishedAt: new Date().toISOString().slice(0, 10), applications: 0, initials: company.name.split(" ").map((word) => word[0]).join("").slice(0, 2) };
    opportunities.unshift(item);
    return item;
  },
  async closeOpportunity(id: string, companyId: string) {
    const item = opportunities.find((opportunity) => opportunity.id === id && opportunity.companyId === companyId);
    if (!item) throw new Error("No tienes permiso para cerrar esta convocatoria.");
    await wait();
    item.status = "closed";
    return item;
  },
  async reactivateOpportunity(id: string, companyId: string) {
    if (!USE_DEMO) return request<Opportunity>(`/company/opportunities/${id}/reactivate`, { method: "POST" });
    const item = opportunities.find((opportunity) => opportunity.id === id && opportunity.companyId === companyId);
    if (!item) throw new Error("No tienes permiso para reactivar esta convocatoria.");
    await wait();
    item.status = "active";
    return item;
  },
  async candidates(opportunityId: string) {
    if (!USE_DEMO) return request<Candidate[]>(`/company/opportunities/${opportunityId}/candidates`);
    await wait();
    const profiles = [
      { id: "student-1", applicationId: "app-3", name: "Mariana López", career: "Ingeniería en Software", date: "2026-10-05", cvName: "CV_Mariana_Lopez.pdf", initials: "ML", email: "mariana.lopez@uas.edu.mx", phone: "668 123 4567", bio: "Estudiante interesada en desarrollo frontend y productos digitales." },
      { id: "student-2", applicationId: "app-4", name: "Carlos Mendoza", career: "Ingeniería Informática", date: "2026-10-02", cvName: "CV_Carlos_Mendoza.pdf", initials: "CM", email: "carlos.mendoza@uas.edu.mx", phone: "668 234 5678", bio: "Interesado en aseguramiento de calidad y automatización." },
      { id: "student-3", applicationId: "app-5", name: "Ana Sofía Ruiz", career: "Diseño Digital", date: "2026-09-30", cvName: "CV_Ana_Ruiz.pdf", initials: "AR", email: "ana.ruiz@uas.edu.mx", phone: "668 345 6789", bio: "Diseñadora enfocada en investigación y experiencias digitales accesibles." },
    ];
    return profiles
      .map((profile) => ({ ...profile, status: applications.find((application) => application.id === profile.applicationId)?.status || "ENVIADA" }) as Candidate)
      .filter((candidate) => applications.some((application) => application.id === candidate.applicationId && application.opportunityId === opportunityId));
  },
  async updateApplicationStatus(opportunityId: string, applicationId: string, status: Application["status"], companyId: string) {
    if (!USE_DEMO) return request<Application>(`/company/opportunities/${opportunityId}/applications/${applicationId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    const opportunity = opportunities.find((item) => item.id === opportunityId && item.companyId === companyId);
    if (!opportunity) throw new Error("No tienes permiso para administrar esta postulación.");
    const application = applications.find((item) => item.id === applicationId && item.opportunityId === opportunityId);
    if (!application) throw new Error("La postulación no existe.");
    await wait();
    application.status = status;
    return application;
  },
};
