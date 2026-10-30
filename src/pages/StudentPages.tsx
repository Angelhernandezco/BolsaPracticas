import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, Download, FileText, Search, UploadCloud, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../app/AuthContext";
import ApplicationStatusBadge, { applicationStatusMeta } from "../components/ApplicationStatus";
import OpportunityCard from "../components/OpportunityCard";
import { Avatar, Button, Card, EmptyState, Field, Input, LoadingState, Select, Textarea, Title } from "../components/ui";
import { api } from "../services/api";
import type { Application, Opportunity } from "../types";

function DashboardHeader({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="dashboard-header"><div><span className="eyebrow">{eyebrow}</span><Title>{title}</Title><p>{text}</p></div>{action}</div>;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  useEffect(() => { if (user) Promise.all([api.listOpportunities(), api.getApplications(user.id)]).then(([opportunities, applications]) => { setItems(opportunities); setApps(applications); }); }, [user]);
  const byId = new Map(items.map((item) => [item.id, item]));
  return <div className="dashboard-page"><DashboardHeader eyebrow="Panel de estudiante" title={`Hola, ${user?.name.split(" ")[0]}`} text="Este es el resumen de tu búsqueda de prácticas profesionales." action={<Link className="button button-primary" to="/estudiante/convocatorias">Explorar oportunidades <ArrowRight /></Link>} /><div className="metric-grid"><Card className="metric-card"><div className="metric-icon blue"><FileText /></div><div><span>Postulaciones</span><strong>{apps.length}</strong><small>realizadas en total</small></div></Card><Card className="metric-card"><div className="metric-icon amber"><Clock3 /></div><div><span>En revisión</span><strong>{apps.filter((item) => item.status === "EN_REVISION").length}</strong><small>según respuesta disponible</small></div></Card><Card className="metric-card"><div className="metric-icon green"><BriefcaseBusiness /></div><div><span>Vacantes activas</span><strong>{items.length}</strong><small>disponibles ahora</small></div></Card></div><div className="dashboard-columns"><Card><div className="card-heading"><div><Title as="h2">Postulaciones recientes</Title><p>Consulta el avance de tus oportunidades.</p></div><Link className="text-link" to="/estudiante/postulaciones">Ver todas</Link></div><div className="list-stack">{apps.slice(0, 3).map((application) => { const opportunity = byId.get(application.opportunityId); return <div className="application-row" key={application.id}><div className="mini-logo blue">{opportunity?.initials}</div><div><strong>{opportunity?.title}</strong><span>{opportunity?.company} · {new Date(application.date).toLocaleDateString("es-MX")}</span></div><ApplicationStatusBadge status={application.status} /></div>; })}</div></Card><Card className="profile-card"><div className="card-heading"><Title as="h2">Tu perfil</Title><span className="completion">{user?.cvName && user.career ? "100%" : "70%"}</span></div><div className="progress-track"><span className={user?.cvName && user.career ? "full" : ""} /></div><ul className="profile-checks"><li><CheckCircle2 /> Datos personales</li><li className={user?.career ? "" : "pending"}><CheckCircle2 /> Carrera</li><li className={user?.cvName ? "" : "pending"}><CheckCircle2 /> Currículum PDF</li></ul><Link className="button button-secondary" to="/estudiante/perfil">Completar perfil</Link></Card></div></div>;
}

export function StudentExplore() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  useEffect(() => { api.listOpportunities().then(setItems).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.company}`.toLowerCase().includes(query.toLowerCase()) && (!area || item.area === area)), [items, query, area]);
  return <div className="dashboard-page"><DashboardHeader eyebrow="Oportunidades" title="Explorar convocatorias" text="Encuentra prácticas alineadas con tus intereses y experiencia." /><Card className="filter-bar"><Field label="Buscar"><div className="input-with-icon"><Search /><Input placeholder="Título o empresa" value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field><Field label="Área"><Select value={area} onChange={(event) => setArea(event.target.value)}><option value="">Todas las áreas</option>{[...new Set(items.map((item) => item.area))].map((item) => <option key={item}>{item}</option>)}</Select></Field></Card>{loading ? <LoadingState /> : <div className="cards-grid">{filtered.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div>}</div>;
}

export function StudentApplications() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (user) Promise.all([api.getApplications(user.id), api.listOpportunities(true)]).then(([a, o]) => { setApps(a); setItems(o); }).finally(() => setLoading(false)); }, [user]);
  const byId = new Map(items.map((item) => [item.id, item]));
  return <div className="dashboard-page"><DashboardHeader eyebrow="Tu actividad" title="Mis postulaciones" text="Consulta las convocatorias a las que has enviado tu perfil." />{loading ? <LoadingState /> : apps.length ? <div className="student-applications">{apps.map((app) => { const item = byId.get(app.opportunityId); const meta = applicationStatusMeta[app.status]; return <Card className={`student-application status-${app.status.toLowerCase()}`} key={app.id}><div className="student-application-main"><div className="table-primary"><div className="mini-logo blue">{item?.initials}</div><span><strong>{item?.title}</strong><small>{item?.company} · Postulación del {new Date(app.date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</small></span></div><ApplicationStatusBadge status={app.status} /><Link className="text-link" to={`/estudiante/convocatorias/${app.opportunityId}?from=postulaciones`}>Ver convocatoria</Link></div><div className="application-message"><strong>{meta.title}</strong><span>{meta.message}</span></div></Card>; })}</div> : <EmptyState icon={<FileText />} title="Aún no tienes postulaciones" text="Explora las convocatorias activas y encuentra una oportunidad para ti." action={<Link className="button button-primary" to="/estudiante/convocatorias">Explorar oportunidades</Link>} />}</div>;
}

export function StudentProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(user!);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const photo = (file?: File) => { if (!file) return; if (!file.type.startsWith("image/") || file.size > 2_000_000) return setMessage("Selecciona una imagen JPG o PNG menor a 2 MB."); const reader = new FileReader(); reader.onload = () => set("photo", String(reader.result)); reader.readAsDataURL(file); };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setMessage(""); try { const updated = await api.updateProfile(form); setUser(updated); setMessage("Tu perfil se actualizó correctamente."); } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar."); } finally { setSaving(false); } };
  return <div className="dashboard-page"><DashboardHeader eyebrow="Cuenta" title="Mi perfil" text="Mantén tus datos académicos y de contacto actualizados." /><form onSubmit={submit} className="settings-layout"><Card className="photo-card"><Avatar size="large" src={form.photo} initials={form.name.split(" ").map((word) => word[0]).join("").slice(0, 2)} /><Title as="h3">Fotografía de perfil</Title><p>JPG o PNG, máximo 2 MB.</p><Input ref={fileRef} type="file" accept="image/png,image/jpeg" className="visually-hidden" onChange={(event) => photo(event.target.files?.[0])} /><Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><UploadCloud /> Seleccionar imagen</Button></Card><Card><Title as="h2">Información personal</Title><div className="form-grid"><Field label="Nombre completo"><Input value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field><Field label="Correo electrónico"><Input value={form.email} disabled /></Field><Field label="Carrera"><Input value={form.career || ""} onChange={(event) => set("career", event.target.value)} required /></Field><Field label="Teléfono"><Input value={form.phone || ""} onChange={(event) => set("phone", event.target.value)} /></Field><Field label="Acerca de ti"><Textarea value={form.bio || ""} onChange={(event) => set("bio", event.target.value)} /></Field></div>{message ? <div className={`notice ${message.includes("correctamente") ? "success" : "warning"}`}>{message}</div> : null}<div className="form-actions"><Button type="submit" loading={saving}>Guardar cambios</Button></div></Card></form></div>;
}

export function StudentCV() {
  const { user, setUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user?.cvUrl || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!file || file.type !== "application/pdf") return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const selectFile = (selected: File | null) => {
    setMessage("");
    if (!selected) return setFile(null);
    if (selected.type !== "application/pdf" || selected.size > 5_000_000) {
      setFile(null);
      setMessage("El archivo debe ser un PDF menor a 5 MB.");
      return;
    }
    setFile(selected);
  };
  const upload = async () => { if (!user || !file) return; setSaving(true); const updated = { ...user, cvName: file.name, cvUpdatedAt: new Date().toISOString().slice(0, 10), cvUrl: previewUrl }; try { await api.updateProfile(updated); setUser(updated); setMessage("Tu currículum se actualizó correctamente."); } finally { setSaving(false); } };
  const currentName = file?.name || user?.cvName;
  return <div className="dashboard-page"><DashboardHeader eyebrow="Documentos" title="Mi currículum" text="Mantén disponible la versión más reciente de tu CV en formato PDF." /><div className="settings-layout curriculum-layout"><Card className="upload-card"><div className="upload-icon"><UploadCloud /></div><Title as="h2">Sube un archivo PDF</Title><p>Selecciona tu currículum desde tu dispositivo. Máximo 5 MB.</p><label className="button button-secondary file-button">Seleccionar archivo<Input type="file" accept="application/pdf" onChange={(event) => selectFile(event.target.files?.[0] || null)} /></label>{file ? <div className="selected-file"><FileText /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span></div> : null}<Button onClick={upload} disabled={!file} loading={saving}>Guardar currículum</Button></Card><Card className="document-card"><div className="document-heading"><div><Title as="h2">Documento actual</Title><p>Vista previa del currículum almacenado.</p></div>{previewUrl ? <a className="button button-secondary" href={previewUrl} download={currentName} target="_blank" rel="noreferrer"><Download /> Descargar</a> : null}</div>{currentName ? <><div className="current-document"><div className="pdf-icon">PDF</div><div><strong>{currentName}</strong><span>{file ? "Nueva versión seleccionada" : `Actualizado el ${new Date(user!.cvUpdatedAt!).toLocaleDateString("es-MX")}`}</span></div></div>{previewUrl ? <div className="pdf-preview"><iframe src={`${previewUrl}#toolbar=1&navpanes=0`} title={`Vista previa de ${currentName}`} /></div> : <div className="preview-unavailable"><FileText /><p>La API no proporcionó una URL autorizada para visualizar este documento.</p></div>}</> : <EmptyState icon={<FileText />} title="Sin currículum" text="Carga un PDF para poder postularte." />}{message ? <div className={`notice ${message.includes("correctamente") ? "success" : "warning"}`}>{message}</div> : null}<div className="safe-note"><CheckCircle2 /><span>Las empresas solo podrán acceder a tu CV cuando te postules a una de sus convocatorias.</span></div></Card></div></div>;
}
