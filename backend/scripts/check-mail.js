import { loadConfig } from '../src/config.js'
import { createMailer } from '../src/services/mail.js'
try {
  await createMailer(loadConfig()).verify()
  console.log(
    'SMTP: conexión y autenticación correctas. No se envió ningún correo.',
  )
} catch (error) {
  console.error('SMTP no disponible:', error.code || error.name)
  process.exitCode = 1
}
