import { BriefcaseBusiness } from 'lucide-react'
import { Link } from 'react-router'

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="Bolsa Prácticas, inicio">
      <span className="brand-mark">
        <BriefcaseBusiness size={21} />
      </span>
      {compact ? null : (
        <span>
          Bolsa <strong>Prácticas</strong>
        </span>
      )}
    </Link>
  )
}
