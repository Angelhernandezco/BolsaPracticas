import { z } from 'zod'
import {
  phoneSchema,
  matriculaSchema,
  rfcSchema,
} from '../../lib/registration-validation.js'
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(150)
  .email('Ingresa un correo válido.')
export const isUasEmail = (email) =>
  /^[^\s@]+@(?:uas\.edu(?:\.mx)?|ms\.uas\.edu\.mx)$/i.test(email.trim())
const text = (max) =>
  z.string().trim().min(1, 'Completa los campos obligatorios.').max(max)
const passwordSchema = z
  .string()
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'La contraseña supera el límite de 72 bytes.',
  )
export const registrationSchema = z.object({
  role: z.enum(['student', 'company']),
  name: text(80),
  email: emailSchema,
  password: passwordSchema.refine(
    (value) => value.length >= 8,
    'Usa una contraseña de al menos 8 caracteres.',
  ),
  matricula: matriculaSchema.optional(),
  career: text(120).optional(),
  rfc: rfcSchema.optional(),
  giro: text(100).optional(),
  address: text(255).optional(),
  phone: phoneSchema.optional(),
})
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema.refine((value) => value.length >= 1),
})
