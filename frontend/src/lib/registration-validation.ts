export function phoneError(value: string): string {
  const phone = value.trim()
  return !phone || /^[0-9]{10}$/.test(phone)
    ? ''
    : 'El teléfono debe contener exactamente 10 dígitos, sin espacios ni guiones.'
}

export function matriculaError(value: string): string {
  return /^[0-9]{1,20}$/.test(value.trim())
    ? ''
    : 'La matrícula debe contener solo números (máximo 20 dígitos).'
}

export function rfcError(value: string): string {
  const match = /^[A-ZÑ&]{3,4}([0-9]{2})([0-9]{2})([0-9]{2})[A-Z0-9]{3}$/.exec(
    value.trim().toUpperCase(),
  )
  if (match) {
    const year = 2000 + Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
      return ''
  }
  return 'El RFC debe tener 12 caracteres (persona moral) o 13 (persona física), con fecha AAMMDD válida y homoclave.'
}
