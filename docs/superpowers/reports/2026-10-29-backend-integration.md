# Entrega de integración de Bolsa Prácticas

## Resultado verificado

- Backend Express JavaScript modular, Prisma y PostgreSQL, JWT revocable en cookie HttpOnly.
- Ambos dominios UAS; correo SMTP real configurado; aprobación administrativa y convenio independiente.
- Archivos locales privados, CV asociado a la postulación y adaptador S3 configurable.
- Frontend conectado, indicador de convenio en detalle, espaciado de avisos y CTA; flujos existentes conservados.
- SQL final instalado en bolsa_practicas_sql_test y comparado contra Prisma: sin diferencias.
- Última suite backend: 40/40 PASS; última suite Chromium: 12/12 PASS. TypeScript y Vite build: PASS. Advertencias existentes de configuración Vite conservadas.
- SMTP: conexión y autenticación comprobadas, sin afirmar entrega a bandeja de entrada. AWS: cliente S3 simulado, bucket real no configurado.
- Smoke instalación local: proxy /api/health 200, login demo 200, convocatorias persistentes 200, CV protegido 200 application/pdf.

## Revisión independiente

Revisor con contexto nuevo: gpt-6-astra. No identificó hallazgos críticos. Dos importantes corregidos en una sola pasada con pruebas RED→GREEN:

1. Rechazar pasar una convocatoria publicada/cerrada a borrador para conservar acceso desde historial.
2. Semilla de demos: transacción para crear cuentas nuevas; si existe algún correo reservado, omitir sin cambiar perfiles, archivos ni relaciones. Probados escenarios de cuentas existentes, instalación nueva y repetición segura.

Una pasada E2E intermedia tuvo una recarga de documento que abortó el POST de registro (trace: segundo GET del documento y respuesta de registro -1). La repetición final con archivos estables terminó 12/12. No se ocultó el fallo ni se añadieron reintentos automáticos de escrituras.

## Decisiones y consecuencias

1. Reutilizar checkout y crear rama codex/backend-integration, sin otro worktree, para conservar el trabajo de Figma y la vista local. Riesgo: cambios comparten directorio; se protegieron con copia inicial durante ejecución.
2. Usar registro de ejecución nativo en Windows en lugar de scripts Bash que esperan encabezados Task, porque el plan usa Tarea y el sandbox restringía Bash. Consecuencia: la evidencia se registró manualmente junto con pruebas/commits, sin depender de esos scripts.
3. Fijar Prisma 6.19 por compatibilidad con Node 22.16 y JavaScript. Separar sentencias inválidas de renombrado generadas antes de aplicarlas. Nombres Prisma internos en inglés mapeados al SQL español. Consecuencia: futuras actualizaciones mayores necesitan revisar esa compatibilidad; SQL final comprobado sin diferencias.
4. Conservar sin staging el frontend que ya tenía cambios de Figma para no incorporarlos como trabajo propio. Consecuencia: el commit posterior del frontend debe incluir tanto la versión actual de Figma como su integración; la rama por sí sola no sustituye esos cambios locales.
5. Conservar los botones demo mediante semilla explícita de desarrollo en la base local inicialmente vacía; administrador privado separado en .env ignorado. Consecuencia: estos datos sintéticos no deben usarse en producción.
6. Mantener esas decisiones al evaluar la revisión; no introducir cambios nuevos por cuestionarlas. Costes descritos en 1–5.
7. Tratar los cambios previos de Figma como propiedad del usuario y revisar nuestra diferencia de integración. Consecuencia: un defecto ajeno de Figma podría necesitar trabajo aparte.
8. No atribuir a SMTP autenticado ni a S3 simulado una comprobación de entrega o infraestructura real. Consecuencia: verificar esos límites externos al desplegar/configurar AWS.
9. Revisor en modo de solo lectura; las suites que escriben en BD fueron ejecutadas por el implementador. Consecuencia: no hubo una segunda ejecución independiente de las pruebas de BD, aunque sí revisión independiente de código y resultados.

## Mejoras menores aplazadas

- Guardar nuevamente un perfil que conserva la misma imagen data URL puede crear otra versión del archivo. Sin pérdida de datos; pendiente sincronizar la imagen del formulario con la URL devuelta para evitar subidas repetidas.
- Añadir prueba específica de limpieza si falla la asociación de archivo en BD y prueba positiva de JPG/PNG. La limpieza y la validación de firma ya están implementadas; falta ampliar esa cobertura automatizada.

## Archivos y ejecución

Instrucciones completas: backend/README.md. SQL: backend/sql/bolsa_practicas.sql. Configuración privada local: backend/.env (ignorada). Aplicación local: http://localhost:8443; backend http://localhost:3001/api. Comandos de raíz: npm run dev:backend, npm run dev, npm run test:backend, npm run test:e2e, npm run typecheck, npm run build.

Se conserva la rama local y los archivos del usuario. No se publicó infraestructura ni se enviaron cambios a un remoto.
