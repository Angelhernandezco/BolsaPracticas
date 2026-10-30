import { ArrowLeft, Building2, CheckCircle2, GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import Logo from "../components/Logo";
import { Button, ControlButton, Field, Input, Title } from "../components/ui";
import { api } from "../services/api";
import type { Role } from "../types";
import { useAuth } from "../app/AuthContext";

export function LoginPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("mariana.lopez@uas.edu.mx");
  const [password, setPassword] = useState("Demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to={user.role === "student" ? "/estudiante" : "/empresa"} replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!email.includes("@") || password.length < 8) { setError("Ingresa un correo válido y una contraseña de al menos 8 caracteres."); return; }
    setLoading(true);
    try {
      const current = await api.login(email, password);
      setUser(current);
      navigate(current.role === "student" ? "/estudiante" : "/empresa");
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible iniciar sesión."); } finally { setLoading(false); }
  };
  return <div className="auth-page"><div className="auth-brand"><Link to="/" className="back-link"><ArrowLeft /> Volver al inicio</Link><div className="auth-brand-content"><Logo /><Title>Tu experiencia profesional comienza con una oportunidad.</Title><p>Encuentra prácticas, comparte tu talento y da seguimiento a cada postulación.</p><ul className="check-list inverse"><li><CheckCircle2 /> Acceso con correo institucional</li><li><CheckCircle2 /> Vacantes privadas para estudiantes</li><li><CheckCircle2 /> Información compartida de forma controlada</li></ul></div></div><main className="auth-form-panel"><form className="auth-form" onSubmit={submit}><div><span className="eyebrow">Bienvenido de nuevo</span><Title>Inicia sesión</Title><p>Ingresa tu correo y contraseña para continuar.</p></div><Field label="Correo electrónico"><div className="input-with-icon"><Mail /><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div></Field><Field label="Contraseña"><div className="input-with-icon"><LockKeyhole /><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div></Field>{error ? <div className="notice warning">{error}</div> : null}<Button type="submit" loading={loading}>Iniciar sesión</Button><div className="demo-note"><strong>Accesos de demostración</strong><ControlButton type="button" onClick={() => { setEmail("mariana.lopez@uas.edu.mx"); setPassword("Demo1234"); }}>Estudiante</ControlButton><ControlButton type="button" onClick={() => { setEmail("empresa@demo.mx"); setPassword("Demo1234"); }}>Empresa</ControlButton><span>Contraseña: Demo1234</span></div><p className="auth-switch">¿Aún no tienes cuenta? <Link to="/registro">Regístrate gratis</Link></p></form></main></div>;
}

export function RegisterPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role>(params.get("rol") === "company" ? "company" : "student");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", rfc: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to={user.role === "student" ? "/estudiante" : "/empresa"} replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    const rfcOk = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(form.rfc.toUpperCase());
    if (!form.name || !form.email.includes("@") || form.password.length < 8) return setError("Completa los campos obligatorios y usa una contraseña de al menos 8 caracteres.");
    if (role === "student" && !form.email.toLowerCase().endsWith("@uas.edu.mx")) return setError("Los estudiantes deben utilizar un correo institucional autorizado con dominio @uas.edu.mx.");
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden.");
    if (role === "company" && !rfcOk) return setError("El RFC debe tener un formato válido de 12 o 13 caracteres.");
    setLoading(true);
    try { const current = await api.register({ ...form, role }); setUser(current); navigate(role === "student" ? "/estudiante" : "/empresa"); } catch (err) { setError(err instanceof Error ? err.message : "No fue posible crear la cuenta."); } finally { setLoading(false); }
  };
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="register-page"><header className="register-head"><Logo /><span>¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></span></header><main className="register-main"><div className="register-intro"><span className="eyebrow">Únete a Bolsa Prácticas</span><Title>Crea una cuenta</Title><p>Selecciona el perfil que mejor te representa. Este rol no podrá modificarse después desde tu perfil.</p></div><form className="register-form" onSubmit={submit}><div className="role-picker"><ControlButton type="button" className={role === "student" ? "role-card active" : "role-card"} onClick={() => setRole("student")}><GraduationCap /><span><strong>Soy estudiante</strong><small>Quiero encontrar prácticas profesionales</small></span>{role === "student" ? <CheckCircle2 /> : null}</ControlButton><ControlButton type="button" className={role === "company" ? "role-card active" : "role-card"} onClick={() => setRole("company")}><Building2 /><span><strong>Soy empresa</strong><small>Quiero publicar convocatorias</small></span>{role === "company" ? <CheckCircle2 /> : null}</ControlButton></div>{role === "student" ? <div className="institutional-inline"><ShieldCheck /><span>Utiliza el correo institucional de tu universidad registrada. Dominio autorizado: <strong>@uas.edu.mx</strong>.</span></div> : null}<div className="form-grid"><Field label={role === "student" ? "Nombre completo" : "Nombre de la empresa"}><Input value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field><Field label={role === "student" ? "Correo institucional" : "Correo electrónico"} hint={role === "student" ? "Debe terminar en @uas.edu.mx" : undefined}><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></Field>{role === "company" ? <Field label="RFC" hint="Validamos el formato, no la existencia legal."><Input value={form.rfc} onChange={(event) => set("rfc", event.target.value.toUpperCase())} maxLength={13} required /></Field> : null}<Field label="Contraseña" hint="Mínimo 8 caracteres."><Input type="password" value={form.password} onChange={(event) => set("password", event.target.value)} required /></Field><Field label="Confirmar contraseña"><Input type="password" value={form.confirm} onChange={(event) => set("confirm", event.target.value)} required /></Field></div>{error ? <div className="notice warning">{error}</div> : null}<div className="terms-note"><ShieldCheck /><span>Al crear tu cuenta aceptas el uso de tus datos para operar la plataforma según tu rol.</span></div><Button type="submit" loading={loading}>Crear mi cuenta</Button></form></main></div>;
}
