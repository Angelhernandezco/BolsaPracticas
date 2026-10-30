import { z } from 'zod';
export const emailSchema=z.string().trim().toLowerCase().max(150).email('Ingresa un correo válido.');
export const isUasEmail=email=>/^[^\s@]+@uas\.edu(?:\.mx)?$/i.test(email.trim());
const text=(max)=>z.string().trim().min(1,'Completa los campos obligatorios.').max(max);
export const registrationSchema=z.object({role:z.enum(['student','company']),name:text(80),email:emailSchema,password:z.string().min(8).max(72),matricula:text(20).optional(),career:text(120).optional(),rfc:z.string().trim().toUpperCase().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,'El RFC no tiene un formato válido.').optional(),giro:text(100).optional(),address:text(255).optional(),phone:z.string().trim().max(30).optional()});
export const loginSchema=z.object({email:emailSchema,password:z.string().min(1).max(72)});
