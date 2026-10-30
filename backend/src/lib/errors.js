import { ZodError } from 'zod'
export class AppError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}
export const invalid = (message) => new AppError(422, 'VALIDATION', message)
export const forbidden = () =>
  new AppError(
    403,
    'FORBIDDEN',
    'No tienes permisos para realizar esta acción.',
  )
export const notFound = () =>
  new AppError(404, 'NOT_FOUND', 'El recurso solicitado ya no está disponible.')
export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return res.destroy()
  if (error instanceof ZodError)
    return res.status(422).json({
      code: 'VALIDATION',
      message: error.issues[0]?.message || 'Revisa los datos ingresados.',
    })
  if (error.code === 'P2002')
    return res.status(409).json({
      code: 'CONFLICT',
      message:
        'Ya existe un registro con ese correo, matrícula, RFC o postulación.',
    })
  if (error.code === 'P2025') error = notFound()
  if (error.code === 'LIMIT_FILE_SIZE' || error.type === 'entity.too.large')
    return res.status(413).json({
      code: 'FILE_SIZE',
      message: 'El archivo excede el tamaño permitido.',
    })
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({
      code: 'BAD_JSON',
      message: 'La solicitud no contiene JSON válido.',
    })
  if (error.retryAfter) res.set('Retry-After', String(error.retryAfter))
  if (error.status)
    return res
      .status(error.status)
      .json({ code: error.code || 'ERROR', message: error.message })
  console.error('Error de servidor:', error.code || error.name || 'Error')
  res.status(500).json({
    code: 'INTERNAL',
    message: 'No pudimos completar la operación. Inténtalo nuevamente.',
  })
}
