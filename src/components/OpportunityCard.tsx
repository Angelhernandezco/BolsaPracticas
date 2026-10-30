import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router";
import type { Opportunity } from "../types";
import { Avatar, Badge, Card, Title } from "./ui";

export default function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return <Card className="opportunity-card">
    <div className="opportunity-top"><Avatar initials={opportunity.initials} /><div><p className="eyebrow">{opportunity.company}</p><Title as="h3">{opportunity.title}</Title></div><Badge tone={opportunity.status === "active" ? "success" : "neutral"}>{opportunity.status === "active" ? "Activa" : "Cerrada"}</Badge></div>
    <p className="muted line-clamp">{opportunity.description}</p>
    <div className="meta-row"><span><MapPin size={16} />{opportunity.area}</span><span><Users size={16} />{opportunity.slots} {opportunity.slots === 1 ? "cupo" : "cupos"}</span><span><CalendarDays size={16} />{new Date(opportunity.publishedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span></div>
    <Link className="text-link" to={`/estudiante/convocatorias/${opportunity.id}`}>Ver convocatoria <ArrowUpRight size={16} /></Link>
  </Card>;
}
