import { BriefcaseBusiness, CheckCircle2, Clock3, Download, Edit3, FilePlus2, Mail, Phone, RefreshCw, Search, UploadCloud, UserRound, UsersRound, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "../app/AuthContext";
import ApplicationStatusBadge from "../components/ApplicationStatus";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, LoadingState, Modal, Select, Textarea, Title } from "../components/ui";
import { api } from "../services/api";
import type { ApplicationStatus, Candidate, Opportunity } from "../types";

function Header({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="dashboard-header"><div><span className="eyebrow">{eyebrow}</span><Title>{title}</Title><p>{text}</p></div>{action}</div>;
}

export function CompanyDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  useEffect(() => { api.listOpportunities(true).then((data) => setItems(data.filter((item) => item.companyId === user?.id))); }, [user]);
  return <div className="dashboard-page"><Header eyebrow="Panel de empresa" title={`Bienvenido, ${user?.name}`} text="Administra tus convocatorias y consulta el talento interesado." action={<Link className="button button-primary" to="/empresa/convocatorias/nueva"><FilePlus2 /> Nueva convocatoria</Link>} /><div className="metric-grid"><Card className="metric-card"><div className="metric-icon blue"><BriefcaseBusiness /></div><div><span>Publicadas</span><strong>{items.length}</strong><small>convocatorias en total</small></div></Card><Card className="metric-card"><div className="metric-icon green"><CheckCircle2 /></div><div><span>Activas</span><strong>{items.filter((item) => item.status === "active").length}</strong><small>recibiendo postulaciones</small></div></Card><Card className="metric-card"><div className="metric-icon amber"><UsersRound /></div><div><span>Postulaciones</span><strong>{items.reduce((total, item) => total + item.applications, 0)}</strong><small>recibidas en total</small></div></Card></div><Card><div className="card-heading"><div><Title as="h2">Convocatorias recientes</Title><p>Estado y respuesta de tus publicaciones.</p></div><Link className="text-link" to="/empresa/convocatorias">Administrar todas</Link></div><div className="list-stack">{items.map((item) => <div className="company-job-row" key={item.id}><div className="metric-icon blue"><BriefcaseBusiness /></div><div><strong>{item.title}</strong><span>{item.slots} cupos · Publicada {new Date(item.publishedAt).toLocaleDateString("es-MX")}</span></div><Badge tone={item.status === "active" ? "success" : "neutral"}>{item.status === "active" ? "Activa" : "Cerrada"}</Badge><span className="candidate-count"><UsersRound /> {item.applications}</span><Link className="text-link" to={`/empresa/convocatorias/${item.id}/candidatos`}>Ver candidatos</Link></div>)}</div></Card></div>;
}

export function ManageOpportunities() {
  const { user } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [closing, setClosing] = useState<Opportunity | null>(null);
  const [reactivating, setReactivating] = useState<Opportunity | null>(null);
  const load = () => api.listOpportunities(true).then((data) => setItems(data.filter((item) => item.companyId === user?.id)));
  useEffect(() => {
    void load();
  }, [user]);
  const close = async () => { if (!closing || !user) return; await api.closeOpportunity(closing.id, user.id); setClosing(null); load(); };
  const reactivate = async () => { if (!reactivating || !user) return; await api.reactivateOpportunity(reactivating.id, user.id); setReactivating(null); load(); };
  const filtered = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) && (!status || item.status === status));
  return <div className="dashboard-page"><Header eyebrow="Administración" title="Mis convocatorias" text="Consulta, edita, cierra o reactiva las vacantes publicadas por tu empresa." action={<Link className="button button-primary" to="/empresa/convocatorias/nueva"><FilePlus2 /> Nueva convocatoria</Link>} /><Card className="filter-bar"><Field label="Buscar"><div className="input-with-icon"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título de la convocatoria" /></div></Field><Field label="Estado"><Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="active">Activas</option><option value="closed">Cerradas</option></Select></Field></Card><Card className="table-card"><div className="data-table company-table"><div className="table-row table-head"><span>Convocatoria</span><span>Cupos</span><span>Estado</span><span>Postulaciones</span><span>Acciones</span></div>{filtered.map((item) => <div className="table-row" key={item.id}><div className="table-primary"><span><strong>{item.title}</strong><small>{new Date(item.publishedAt).toLocaleDateString("es-MX")}</small></span></div><span data-label="Cupos">{item.slots}</span><span data-label="Estado"><Badge tone={item.status === "active" ? "success" : "neutral"}>{item.status === "active" ? "Activa" : "Cerrada"}</Badge></span><span data-label="Postulaciones">{item.applications}</span><div className="row-actions"><Link className="icon-button" aria-label="Ver candidatos" to={`/empresa/convocatorias/${item.id}/candidatos`}><UsersRound /></Link><Link className="icon-button" aria-label="Editar" to={`/empresa/convocatorias/${item.id}/editar`}><Edit3 /></Link>{item.status === "active" ? <Button variant="ghost" aria-label="Cerrar convocatoria" title="Cerrar convocatoria" onClick={() => setClosing(item)}><XCircle /></Button> : <Button variant="ghost" aria-label="Reactivar convocatoria" title="Reactivar convocatoria" onClick={() => setReactivating(item)}><RefreshCw /></Button>}</div></div>)}</div></Card><Modal open={!!closing} title="Cerrar convocatoria" onClose={() => setClosing(null)} actions={<><Button variant="secondary" onClick={() => setClosing(null)}>Cancelar</Button><Button variant="danger" onClick={close}>Sí, cerrar convocatoria</Button></>}><p>La convocatoria <strong>{closing?.title}</strong> dejará de recibir postulaciones. Esta acción requiere confirmación.</p></Modal><Modal open={!!reactivating} title="Reactivar convocatoria" onClose={() => setReactivating(null)} actions={<><Button variant="secondary" onClick={() => setReactivating(null)}>Cancelar</Button><Button onClick={reactivate}>Sí, reactivar convocatoria</Button></>}><p>La convocatoria <strong>{reactivating?.title}</strong> volverá a aparecer para los estudiantes y podrá recibir nuevas postulaciones.</p></Modal></div>;
}

export function OpportunityForm() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", area: "", slots: "1", contact: user?.contact || "" });
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) api.getOpportunity(id).then((item) => { if (item.companyId !== user?.id) throw new Error("No tienes permiso para editar esta convocatoria."); setForm({ title: item.title, description: item.description, area: item.area, slots: String(item.slots), contact: item.contact }); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [id, user]);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!user) return; if (!Number.isInteger(Number(form.slots)) || Number(form.slots) < 1) return setError("Los cupos deben ser un número entero mayor a cero."); setSaving(true); try { await api.saveOpportunity({ ...form, id, slots: Number(form.slots) }, user); navigate("/empresa/convocatorias"); } catch (err) { setError(err instanceof Error ? err.message : "No fue posible guardar."); } finally { setSaving(false); } };
  if (loading) return <LoadingState />;
  return <div className="dashboard-page"><Header eyebrow="Convocatorias" title={id ? "Editar convocatoria" : "Nueva convocatoria"} text="Describe claramente la oportunidad para recibir postulaciones relevantes." /><form onSubmit={submit}><Card className="form-card"><Title as="h2">Información de la vacante</Title><div className="form-grid"><Field label="Título de la convocatoria"><Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Ej. Practicante de Desarrollo Frontend" required /></Field><Field label="Área profesional"><Input value={form.area} onChange={(event) => set("area", event.target.value)} placeholder="Ej. Tecnologías de la información" required /></Field><Field label="Descripción de la vacante"><Textarea value={form.description} onChange={(event) => set("description", event.target.value)} rows={7} required /></Field><Field label="Número de cupos"><Input type="number" min="1" step="1" value={form.slots} onChange={(event) => set("slots", event.target.value)} required /></Field><Field label="Datos de contacto"><Input value={form.contact} onChange={(event) => set("contact", event.target.value)} required /></Field></div>{error ? <div className="notice warning">{error}</div> : null}<div className="form-actions"><Link className="button button-secondary" to="/empresa/convocatorias">Cancelar</Link><Button type="submit" loading={saving}>{id ? "Guardar cambios" : "Publicar convocatoria"}</Button></div></Card></form></div>;
}

export function CandidatesPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<Opportunity | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([api.getOpportunity(id), api.candidates(id)]).then(([opportunity, list]) => { if (opportunity.companyId !== user?.id) throw new Error("No tienes permiso para consultar estos candidatos."); setItem(opportunity); setCandidates(list); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [id, user]);
  const saveStatus = async () => {
    if (!selected || !user) return;
    setSavingStatus(true);
    setStatusMessage("");
    try {
      await api.updateApplicationStatus(id, selected.applicationId, selected.status, user.id);
      setCandidates((current) => current.map((candidate) => candidate.applicationId === selected.applicationId ? selected : candidate));
      setSelected(null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "No fue posible actualizar el estado.");
    } finally {
      setSavingStatus(false);
    }
  };
  if (loading) return <LoadingState />;
  if (error) return <div className="dashboard-page"><EmptyState icon={<UsersRound />} title="Acceso no disponible" text={error} /></div>;
  return <div className="dashboard-page"><Header eyebrow="Candidatos" title={item?.title || "Postulaciones"} text={`${candidates.length} estudiantes han compartido su perfil para esta convocatoria.`} action={<Link className="button button-secondary" to="/empresa/convocatorias">Volver</Link>} />{candidates.length ? <div className="candidate-grid">{candidates.map((candidate) => <Card className="candidate-card" key={candidate.id}><div className="candidate-head"><Avatar initials={candidate.initials} /><div><Title as="h3">{candidate.name}</Title><p>{candidate.career}</p></div><ApplicationStatusBadge status={candidate.status} /></div><div className="candidate-meta"><span><Clock3 /> {new Date(candidate.date).toLocaleDateString("es-MX")}</span><span><UserRound /> Perfil disponible</span></div><div className="candidate-actions"><a className="button button-secondary" href="/demo-cv.pdf" download={candidate.cvName}><Download /> Descargar CV</a><Button onClick={() => { setSelected(candidate); setStatusMessage(""); }}>Ver y administrar</Button></div></Card>)}</div> : <EmptyState icon={<UsersRound />} title="Aún no hay candidatos" text="Las postulaciones aparecerán aquí cuando los estudiantes compartan su perfil." />}<Modal open={!!selected} title="Perfil del candidato" onClose={() => setSelected(null)} actions={<><Button variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button><Button loading={savingStatus} onClick={saveStatus}>Guardar estado</Button></>}>{selected ? <div className="candidate-profile"><div className="candidate-profile-head"><Avatar size="large" initials={selected.initials} /><div><Title as="h2">{selected.name}</Title><p>{selected.career}</p><ApplicationStatusBadge status={selected.status} /></div></div><div className="profile-contact-grid"><span><Mail /> <span><small>Correo institucional</small><strong>{selected.email}</strong></span></span><span><Phone /> <span><small>Teléfono</small><strong>{selected.phone || "No disponible"}</strong></span></span></div><div className="profile-summary"><Title as="h3">Acerca del estudiante</Title><p>{selected.bio || "El estudiante no ha añadido una descripción."}</p></div><div className="profile-cv"><div><FilePlus2 /><span><strong>{selected.cvName}</strong><small>Currículum adjunto a la postulación</small></span></div><a className="button button-secondary" href="/demo-cv.pdf" target="_blank" rel="noreferrer"><Download /> Ver PDF</a></div><Field label="Estado de la postulación"><Select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as ApplicationStatus })}><option value="ENVIADA">Enviada</option><option value="EN_REVISION">En revisión</option><option value="ACEPTADA">Aceptada</option><option value="RECHAZADA">Rechazada</option></Select></Field>{statusMessage ? <div className={`notice ${statusMessage.includes("correctamente") ? "success" : "warning"}`}>{statusMessage}</div> : null}</div> : null}</Modal></div>;
}

export function CompanyProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(user!);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const logo = (file?: File) => { if (!file) return; if (!file.type.startsWith("image/") || file.size > 2_000_000) return setMessage("Selecciona una imagen JPG o PNG menor a 2 MB."); const reader = new FileReader(); reader.onload = () => set("logo", String(reader.result)); reader.readAsDataURL(file); };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); const rfcOk = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test((form.rfc || "").toUpperCase()); if (!rfcOk) { setSaving(false); return setMessage("Revisa el formato del RFC."); } const updated = await api.updateProfile(form); setUser(updated); setMessage("El perfil de la empresa se actualizó correctamente."); setSaving(false); };
  return <div className="dashboard-page"><Header eyebrow="Cuenta empresarial" title="Perfil de empresa" text="Esta información acompaña tus convocatorias y facilita el contacto." /><form className="settings-layout" onSubmit={submit}><Card className="photo-card"><Avatar size="large" src={form.logo} initials={form.name.split(" ").map((word) => word[0]).join("").slice(0, 2)} /><Title as="h3">Logotipo institucional</Title><p>JPG o PNG, máximo 2 MB.</p><Input ref={fileRef} type="file" accept="image/png,image/jpeg" className="visually-hidden" onChange={(event) => logo(event.target.files?.[0])} /><Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><UploadCloud /> Seleccionar logotipo</Button></Card><Card><Title as="h2">Información de la empresa</Title><div className="form-grid"><Field label="Nombre de la empresa"><Input value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field><Field label="RFC" hint="Solo se valida el formato."><Input value={form.rfc || ""} onChange={(event) => set("rfc", event.target.value.toUpperCase())} required /></Field><Field label="Correo de contacto"><Input value={form.contact || ""} onChange={(event) => set("contact", event.target.value)} required /></Field><Field label="Teléfono"><Input value={form.phone || ""} onChange={(event) => set("phone", event.target.value)} /></Field><Field label="Descripción"><Textarea value={form.bio || ""} onChange={(event) => set("bio", event.target.value)} /></Field></div>{message ? <div className={`notice ${message.includes("correctamente") ? "success" : "warning"}`}>{message}</div> : null}<div className="form-actions"><Button type="submit" loading={saving}>Guardar cambios</Button></div></Card></form></div>;
}
