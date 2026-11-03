import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^[0-9]{10}$/.test(value), {
    message:
      'El teléfono debe contener exactamente 10 dígitos, sin espacios ni guiones.',
  })

export const matriculaSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{1,20}$/,
    'La matrícula debe contener solo números (máximo 20 dígitos).',
  )

export const rfcSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => {
    const match =
      /^[A-ZÑ&]{3,4}([0-9]{2})([0-9]{2})([0-9]{2})[A-Z0-9]{3}$/.exec(value)
    if (!match) return false
    const year = 2000 + Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }, 'El RFC debe tener 12 caracteres (persona moral) o 13 (persona física), con fecha AAMMDD válida y homoclave.')
