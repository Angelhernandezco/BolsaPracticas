import { ArrowUpRight, CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router'
import type { Opportunity } from '../types'
import { Avatar, Badge, Card, Title } from './ui'
import { formatCalendarDate } from '../services/api'

export default function OpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity
}) {
  return (
    <Card className="opportunity-card">
      <div className="opportunity-top">
        <Avatar src={opportunity.companyLogo} initials={opportunity.initials} />
        <div>
          <p className="eyebrow">{opportunity.company}</p>
          <Title as="h3">{opportunity.title}</Title>
        </div>
        <Badge
          tone={
            opportunity.status === 'open'
              ? 'success'
              : opportunity.status === 'draft'
                ? 'warning'
                : 'neutral'
          }
        >
          {opportunity.status === 'open'
            ? 'Abierta'
            : opportunity.status === 'draft'
              ? 'Borrador'
              : 'Cerrada'}
        </Badge>
      </div>
      <p className="muted line-clamp">{opportunity.description}</p>
      <div className="meta-row">
        <span>
          <MapPin size={16} />
          {opportunity.area}
        </span>
        <span>
          <Users size={16} />
          {opportunity.slots} {opportunity.slots === 1 ? 'cupo' : 'cupos'}
        </span>
        <span>
          <CalendarDays size={16} />
          Cierra {formatCalendarDate(opportunity.closingDate)}
        </span>
      </div>
      <Link
        className="text-link"
        to={`/estudiante/convocatorias/${opportunity.id}`}
      >
        Ver convocatoria <ArrowUpRight size={16} />
      </Link>
    </Card>
  )
}
