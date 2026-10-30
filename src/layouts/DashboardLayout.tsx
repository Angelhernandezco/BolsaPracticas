import { BriefcaseBusiness, Building2, FileText, Home, LogOut, Menu, PlusCircle, UserRound, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import Logo from "../components/Logo";
import { Avatar, Button } from "../components/ui";
import { useAuth } from "../app/AuthContext";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const studentLinks = [
    ["/estudiante", Home, "Resumen"],
    ["/estudiante/convocatorias", BriefcaseBusiness, "Explorar convocatorias"],
    ["/estudiante/postulaciones", FileText, "Mis postulaciones"],
    ["/estudiante/curriculum", FileText, "Mi currículum"],
    ["/estudiante/perfil", UserRound, "Mi perfil"],
  ] as const;
  const companyLinks = [
    ["/empresa", Home, "Resumen"],
    ["/empresa/convocatorias", BriefcaseBusiness, "Mis convocatorias"],
    ["/empresa/convocatorias/nueva", PlusCircle, "Nueva convocatoria"],
    ["/empresa/perfil", Building2, "Perfil de empresa"],
  ] as const;
  const links = user.role === "student" ? studentLinks : companyLinks;
  const handleLogout = async () => { await logout(); navigate("/"); };
  return <div className="dashboard-shell"><aside className={open ? "sidebar open" : "sidebar"}><div className="sidebar-brand"><Logo /><Button variant="ghost" className="sidebar-close" onClick={() => setOpen(false)}><X /></Button></div><div className="account-chip"><Avatar initials={user.name.split(" ").map((word) => word[0]).join("").slice(0, 2)} /><div className="account-details"><strong>{user.name}</strong><span>{user.role === "student" ? "Estudiante" : "Empresa"}</span></div></div><nav className="side-nav">{links.map(([to, Icon, label]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)}><Icon size={19} />{label}</NavLink>)}</nav><div className="sidebar-spacer" /><Button variant="ghost" onClick={handleLogout}><LogOut size={19} />Cerrar sesión</Button></aside><div className="dashboard-main"><header className="mobile-dashboard-head"><Button variant="ghost" onClick={() => setOpen(true)}><Menu /></Button><Logo /><Avatar size="small" initials={user.name.slice(0, 2).toUpperCase()} /></header><Outlet /></div>{open ? <div className="sidebar-scrim" onClick={() => setOpen(false)} /> : null}</div>;
}
