import { invalid } from "./errors.js"
export function mazatlanDate(now) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mazatlan",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return `${p.year}-${p.month}-${p.day}`
}
export function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw invalid("Ingresa una fecha de cierre válida.")
  const d = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== value)
    throw invalid("La fecha de cierre no existe.")
  return d
}
export function effectiveStatus(row, now) {
  if (row.status === "BORRADOR") return "draft"
  if (
    row.status === "CERRADA" ||
    (row.closingDate &&
      mazatlanDate(now) > row.closingDate.toISOString().slice(0, 10))
  )
    return "closed"
  return "open"
}
