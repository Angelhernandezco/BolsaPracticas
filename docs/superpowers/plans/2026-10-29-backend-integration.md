# Bolsa Prácticas Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar los flujos actuales de Figma a una API persistente y probada, con correo real y almacenamiento local configurable para S3.

**Architecture:** Express ESM por módulos dentro de backend/, Prisma y PostgreSQL, JWT en cookie con sesión revocable. Frontend conserva rutas y pantallas, usa /api mediante proxy de Vite; almacenamiento y correo se inyectan para pruebas sin servicios externos.

**Tech Stack:** Node.js 22, JavaScript ESM, Express, Prisma ORM, PostgreSQL 18 local, bcrypt, jsonwebtoken, Nodemailer, Multer, Zod, AWS SDK S3; node:test, Supertest y Playwright para pruebas. Resolver versiones compatibles al instalar y fijarlas en lockfile; no convertir React/TypeScript existente.

**Spec:** docs/superpowers/specs/2026-10-29-backend-integration-design.md

## Global Constraints

- “Los cambios de Figma que ya están sin commit son trabajo del usuario y se conservan.”
- “JavaScript es la restricción del backend nuevo.”
- “Estudiantes: aceptar cualquiera de los dominios exactos @uas.edu o @uas.edu.mx, normalizando espacios exteriores y mayúsculas; rechazar subdominios y sufijos adicionales.”
- “JWT con expiración de 8 horas en cookie HttpOnly, SameSite=Lax y Secure en HTTPS.”
- “Tokens aleatorios, guardar solo hash, expiración de 24 horas y uso único. Reenvío con espera mínima de 60 segundos controlada por servidor; nuevo token invalida anteriores.”
- “closingDate es SQL DATE (YYYY-MM-DD). Acepta hoy o posterior. El plazo termina al comenzar el día siguiente en America/Mazatlan.”
- “CV PDF máximo 5 MB; foto/logo JPG o PNG máximo 2 MB, validando tipo y firma del contenido, no solo extensión/MIME declarado.”
- “No ejecutar SQL de limpieza adjunto ni resetear datos.”
- “Ninguna contraseña, token, conexión privada ni clave de Gmail se incorpora al frontend, SQL, documentación, commits o logs.”
- “No incluye desplegar infraestructura en AWS, chat, aplicación móvil ni funciones administrativas adicionales.”

## Review Focus

- Registro guardado y SMTP fallido: cuenta recuperable mediante login/reenvío sin mensaje falso de entrega (tarea 3).
- Token abierto con sesión de otra persona: verificar propiedad del correo sin sustituir identidad ni exponer perfil ajeno (tarea 3).
- Cierre/postulación o resolución administrativa simultáneos: resultados consistentes y sin duplicados (tareas 5 y 6).
- Cambio de driver y reemplazo de CV: archivos anteriores siguen accesibles únicamente a sus destinatarios originales (tareas 4 y 6).
- Fechas de calendario, contenido largo y viewport pequeño: sin cambio de día ni botones de modal inaccesibles (tareas 5 y 8).

---

## Mapa de archivos y contratos

Crear backend/package.json y backend/src/server.js (arranque), app.js (composición inyectable), config.js (entorno validado), lib/prisma.js (cliente), lib/errors.js (errores públicos), lib/dates.js (calendario Mazatlán), middleware/security.js (Origin/CORS/límites), middleware/auth.js (sesión/permisos).

Crear backend/src/modules/{auth,catalogs,profiles,opportunities,applications,admin}/. Cada módulo usa routes.js para rutas, controller.js para HTTP y service.js para dominio. Agregar schemas.js o serializers.js solo donde validación/mapeo lo justifique. No introducir una capa repository que replique Prisma.

Crear backend/src/services/mail.js y storage/{index,local,s3}.js; backend/src/modules/files/{routes,controller,service}.js autoriza y sirve archivos.

Crear backend/prisma/schema.prisma, migrations/, seed.js; backend/sql/bolsa_practicas.sql (instalación limpia sin DROP), README.md y .env.example. backend/scripts/{inspect-db,prepare-test-db,check-mail}.js para diagnóstico seguro.

Crear backend/tests/{helpers.js,database.test.js,auth.test.js,email.test.js,storage.test.js,admin.test.js,opportunities.test.js,applications.test.js}; tests/e2e/{fixtures.js,flows.spec.js,errors.spec.js,layout.spec.js}, playwright.config.js y fixtures de archivos válidos/invalidos.

Modificar src/services/api.ts, src/types/index.ts, src/pages/{AuthPages,StudentPages,PublicPages}.tsx, src/index.css, vite.config.ts y package.json. Solo modificar AuthContext/AdminPages/CompanyPages/ui.tsx si lo exige la integración o el espaciado. No reorganizar pantallas. Guardar configuración secreta en backend/.env ignorado; frontend .env.local solo VITE_API_URL=/api y VITE_USE_MOCKS=false.

Contrato HTTP conserva objetos User/Opportunity/Application/Candidate/CompanyReview definidos en src/types/index.ts. id es string del identificador de usuario en User y companyId/studentId, no ID de perfil; usar serializers explícitos. careerIds mantiene nombres de carreras para no cambiar selects. Opportunity añade hasUasAgreement:boolean. Fechas de calendario se envían como YYYY-MM-DD; fechas de eventos como ISO.

`createApp({prisma,storage,mailer,clock,config}) -> Express app`; `clock() -> Date`. Tests crean app con base de pruebas y correo capturable. `AppError(status,code,message)` produce JSON `{code,message}` sin stack ni detalles internos. Los endpoints devuelven JSON también al cerrar sesión; respuestas 409 para conflictos y 429 con Retry-After para límites.

### Tarea 1: Persistencia y arranque seguros

**Files:** crear configuración, app/server, Prisma, scripts de inspección/pruebas, SQL y test de base del mapa; modificar .gitignore para permitir .env.example y excluir backend/storage.

**Interfaces:** `loadConfig(env) -> config`; `assertTestDatabase(url,appUrl) -> void`; `serializeUser(record) -> User`; `GET /api/health -> {status:"ok"}`. Prisma exporta modelos Rol, Usuario, Carrera, Estudiante, Empresa, Convocatoria, ConvocatoriaCarrera, Postulacion, Archivo, Sesion y VerificacionEmail, con tablas en español mediante @@map.

- [x] **Paso 1:** Inspeccionar en modo lectura esquema/tablas/conteos de la base indicada usando inspect-db; no imprimir credenciales ni registros personales. Registrar si requiere baseline o migración compatible. Detener solo la migración si aparecen conflictos que impliquen pérdida de datos.
- [x] **Paso 2:** Preparar package.json de backend y escribir database.test.js con pruebas `rejects_application_database_as_test_target`, `health_checks_database`, `enforces_unique_profiles_and_applications`. Aserciones: misma URL/BD de aplicación rechazada; /health 200 con BD válida; duplicado usuario/perfil o par convocatoria-estudiante falla en PostgreSQL. Ejecutar `node --test tests/database.test.js` desde backend; debe fallar por módulos/modelos ausentes.
- [x] **Paso 3:** Implementar configuración validada, cliente y esquema: IDs enteros serializados como string, relaciones uno-a-uno, estados SQL del diseño, borradores con campos opcionales y cupos 0 permitidos solo en borrador, cierre DATE separado de cerrado_en; biografía, contacto y aprobación; referencias a archivos, sesiones y hash/expiración/uso de tokens. Configurar script de test como `node --test --test-concurrency=1 tests/*.test.js`; para un archivo usar `node --test tests/database.test.js` desde backend. Crear base de pruebas separada tras validar nombre y URL; migraciones sin reset. Generar SQL equivalente de instalación y semilla idempotente de roles/carreras; admin y demos opcionales por entorno, sin sobrescribir cuentas existentes.
- [x] **Paso 4:** Ejecutar `node --test tests/database.test.js` desde backend y validar Prisma y migraciones tanto en BD nueva de pruebas como contra estado existente inspeccionado. Éxito: tests PASS, SQL/migraciones coherentes, datos existentes conservados. No aplicar DDL a base existente sin ruta de migración comprobada.
- [x] **Paso 5:** Commit únicamente archivos de esta tarea y documentación relacionada, enumerando rutas; no incluir cambios de Figma ajenos. Mensaje `feat: add persistent backend foundation`.

### Tarea 2: Autenticación y permisos

**Files:** crear módulos auth/catalogs, middleware auth/security, serializers y tests/auth.test.js; ampliar app.js.

**Interfaces:** `createSession(userId) -> {token,expiresAt}`; `requireSession`, `requireRole(...roles)`, `requireVerified`, `requireApprovedCompany` middlewares. POST /auth/register recibe RegistrationInput, /auth/login recibe `{email,password}`, /auth/logout revoca sesión; GET /auth/session devuelve User; GET /catalogs/careers devuelve string[]. Todas bajo /api. Auth service recibe Prisma/config/clock/mail hook inyectable; no enviar correos todavía.

- [x] **Paso 1:** Escribir tests `accepts_both_exact_uas_domains`, `rejects_subdomains_and_public_admin`, `logout_revokes_cookie_token`, `profile_states_are_enforced`, `cross_origin_mutation_is_rejected`. Aserciones: espacios/mayúsculas normalizados; @uas.edu.mx.otro.com y @sub.uas.edu rechazados 422; rol admin rechazado; cookie HttpOnly/SameSite; sesión inválida tras logout; usuario sin verificar y empresa pendiente reciben 403 en rutas de negocio; Origin ajeno 403; contraseña nunca en JSON. Probar expiración a 8 horas con clock inyectado.
- [x] **Paso 2:** Ejecutar `node --test tests/auth.test.js` en backend; esperar FAIL de endpoints/permisos todavía ausentes.
- [x] **Paso 3:** Implementar bcrypt, JWT firmado con sessionId, sesión persistida/revocable, whitelist de campos y consulta de estado actual. Proteger rutas de negocio con middlewares; permitir sesión/verificación/logout a cuentas pendientes. Limitar intentos login por cliente y evitar deshabilitar seguridad en modo test. Configurar CORS exacto y Origin en mutaciones; cliente sin Origin permitido como llamada no browser con cookie SameSite y sin CORS abierto. Parsear errores de unicidad como conflictos públicos. Catálogo accesible para registro sin sesión.
- [x] **Paso 4:** Ejecutar `node --test tests/auth.test.js tests/database.test.js`; PASS para permisos, expiración, no filtración y ambos dominios.
- [x] **Paso 5:** Commit selectivo `feat: add revocable JWT authentication and role guards`.

### Tarea 3: Verificación real y recuperable de correo

**Files:** crear services/mail.js, auth/email.service.js, tests/email.test.js y scripts/check-mail.js; ampliar auth/routes/controller/service y serializers si requiere.

**Interfaces:** `mailer.sendVerification({to,url}) -> Promise<void>`; `requestVerification(userId) -> {retryAfter:60}`; `verifyEmail(token,currentUserId?) -> {result,user?}`. POST /auth/email/resend y POST /auth/email/verify con `{token}`. Usar POST en verificación para que GET no modifique datos; la ruta de pantalla /verificar-email?token sigue igual. Registro devuelve User y `verificationEmailSent:boolean` adicional para informar fallo de SMTP sin perder sesión/cuenta.

- [x] **Paso 1:** Escribir tests `token_is_hashed_expires_and_is_single_use`, `resend_enforces_60_seconds`, `smtp_failure_preserves_account`, `foreign_session_is_not_replaced`. Aserciones: hash diferente del token; 24h vencido => expired; usado => already_verified sin nuevo efecto; token sustituido => invalid; reenvío temprano 429 y Retry-After; token nunca en respuesta; SMTP fallido conserva cuenta, sesión y permite reenvío posterior; abrir token ajeno no devuelve user ni cambia cookie de sesión. Dos verificaciones simultáneas dejan un solo consumo efectivo.
- [x] **Paso 2:** Ejecutar `node --test tests/email.test.js`; FAIL esperado sin implementación de envío/tokens.
- [x] **Paso 3:** Implementar tokens criptográficos y transacción de consumo, Nodemailer SMTP Gmail configurable y URL desde FRONTEND_URL. Incorporar envío al registro con resultado explícito; invalidar previos y controlar cooldown en BD, no solo memoria. Resultados inválido/vencido como JSON compatible. Configuración test inyecta outbox; jamás añadir endpoint de tokens/bypass a la API normal.
- [x] **Paso 4:** Ejecutar `node --test tests/email.test.js tests/auth.test.js`. Ejecutar check-mail con .env local sin mostrar contraseña para verificar SMTP; entrega de prueba solo al buzón proporcionado si se prueba envío real. Reportar por separado verificación SMTP y entrega observada.
- [x] **Paso 5:** Commit selectivo `feat: verify email with expiring single-use links`.

### Tarea 4: Archivos y perfiles persistentes

**Files:** crear adapters storage, módulo files, módulo profiles y tests/storage.test.js; agregar fixtures PDF/JPG/PNG válidos y archivos falsos.

**Interfaces:** `storage.put({driver,key,buffer,contentType})`, `storage.get({driver,key}) -> {stream,contentType}`, `storage.delete({driver,key})`; registro de driver por archivo. POST /students/cv multipart `file` -> User; POST /profiles/image multipart `file` -> User; GET /files/:id -> bytes autorizados. PUT /students/profile y /companies/profile aceptan whitelist de perfil y devuelven User; actualizar conjuntamente el cliente que hoy construye companys/profile. No aceptar URLs de archivo arbitrarias como propiedad de perfil.

- [x] **Paso 1:** Escribir tests `validates_file_signature_and_size`, `rejects_path_traversal_and_foreign_cv`, `keeps_previous_driver_readable`, `s3_uses_private_objects`, `cleans_upload_on_database_failure`, `profile_cannot_change_privileges`. Aserciones: PDF falso 422, >5_000_000 bytes 413; imagen >2_000_000 413; SVG rechazado; key inválida no sale del directorio; driver registrado manda lectura aunque cambie default; S3 no usa ACL público; fallo DB elimina objeto recién creado; convenio/rol/emailVerified no cambia por PUT.
- [x] **Paso 2:** Ejecutar `node --test tests/storage.test.js`; FAIL esperado antes de archivos/perfiles.
- [x] **Paso 3:** Implementar adaptadores local/S3, claves UUID, Multer con límites y comprobación real de contenido. Persistir metadatos y referencias; local fuera de public, stream con Content-Type/Content-Disposition seguros, Cache-Control privado y soporte Range para PDF. Autorizar propietario y empresa mediante relación de postulación; imagen propia o necesaria para candidato/empresa dentro del alcance de rol. Inyectar cliente S3 para pruebas sin AWS. Mantener CV anteriores referenciados. Actualización de perfil transaccional con carreras, matrícula, RFC y nombre completo.
- [x] **Paso 4:** Ejecutar `node --test tests/storage.test.js tests/auth.test.js`; comprobar bytes devueltos y solicitudes Range válidas/416, errores y aislamiento de permisos. S3 PASS simulado no cuenta como integración AWS real.
- [x] **Paso 5:** Commit selectivo `feat: persist private files and role profiles`.

### Tarea 5: Solicitudes empresariales y convenio

**Files:** crear módulo admin y tests/admin.test.js; ampliar servicios/serialización de empresa.

**Interfaces:** GET /admin/companies -> CompanyReview[]; PATCH /admin/companies/:id/uas-agreement `{hasUasAgreement:boolean}` -> CompanyReview; POST /admin/companies/:id/decision `{decision:"approved"|"rejected",reason:string}` -> CompanyReview.

- [x] **Paso 1:** Escribir tests `agreement_is_independent_from_approval`, `only_admin_resolves_verified_pending_companies`, `concurrent_decisions_resolve_once`, `counts_all_company_opportunities`. Aserciones: checkbox cambia sin aprobación, aprobar sin convenio permitido, motivo vacío rechazado, correo no verificado rechazado; dos decisiones concurrentes producen un éxito y un 409; contadores incluyen todos los estados; admin no accede a CV ni candidatos ni modifica datos empresariales fuera de convenio.
- [x] **Paso 2:** Ejecutar `node --test tests/admin.test.js`; FAIL esperado sin rutas.
- [x] **Paso 3:** Implementar autorización admin, lista segura con conteos Prisma, actualización de convenio y resolución atómica condicionada a estado pendiente/verificado. Guardar resolvedAt/resolvedBy como referencia al admin y serializar nombre para frontend. No incluir hash, tokens ni sesiones en DTO.
- [x] **Paso 4:** Ejecutar `node --test tests/admin.test.js tests/auth.test.js`; PASS incluyendo concurrencia y restricciones de alcance.
- [x] **Paso 5:** Commit selectivo `feat: review companies and manage UAS agreements`.

### Tarea 6: Convocatorias, postulaciones e historial

**Files:** crear módulos opportunities/applications, lib/dates.js, tests/opportunities.test.js y tests/applications.test.js; actualizar permisos files para CV de postulaciones reales.

**Interfaces:** GET /opportunities[?all=true], GET /opportunities/:id -> Opportunity; POST /company/opportunities y PUT /company/opportunities/:id reciben Partial<Opportunity> más intent draft|publish|save; POST /company/opportunities/:id/{close,reactivate}. GET /applications/me -> Application[]; POST /applications `{opportunityId}` -> Application; GET /company/opportunities/:id/candidates -> Candidate[]; PATCH /company/opportunities/:id/applications/:applicationId/status `{status}` -> Application. `mazatlanDate(now:Date) -> YYYY-MM-DD`, `effectiveStatus(record,now) -> draft|open|closed`.

- [x] **Paso 1:** Escribir tests `draft_requires_only_title`, `published_requires_complete_fields`, `calendar_deadline_uses_mazatlan`, `list_hides_foreign_drafts`, `agreement_is_current`. Aserciones: borrador solo título válido; publicar con 0 cupos o sin carrera falla; cierre 2026-10-29 abierto a 2026-10-30T06:59:59Z y cerrado a 2026-10-30T07:00:00Z; fecha hoy aceptada sin cambio de día; empresa solo ve propias; convenio actualizado se refleja en detalle; reactivar vencida falla hasta editar fecha.
- [x] **Paso 2:** Escribir tests `duplicate_and_close_races_are_consistent`, `cv_snapshot_survives_replacement`, `closed_opportunity_keeps_history`, `status_updates_require_owner`. Aserciones: Promise.all de dos postulaciones => una fila/éxito y un 409; cierre y postulación usan mismo bloqueo de convocatoria y serializan el resultado; reemplazar CV conserva bytes previos para empresa, no concede acceso al nuevo CV sin postulación; historial sigue mostrando título/empresa/estado; cupos no cambian por postulación/aceptación. Ejecutar ambos archivos y confirmar FAIL antes de implementación.
- [x] **Paso 3:** Implementar validadores, serializers DTO, relación de carreras, filtros por rol y estado efectivo sin mutaciones GET. Usar transacciones con bloqueo de fila de convocatoria para cierre/edición/postulación, unicidad de postulación y referencias al CV persistido; guardar título/empresa de respaldo. Validar IDs y status/intent desconocidos. Aplicar reglas de borrador y fecha del diseño; edición de cerrada para cambiar fecha debe ser posible sin exigir reactivación automática. Contactos separados y timezone fija.
- [x] **Paso 4:** Ejecutar `node --test tests/opportunities.test.js tests/applications.test.js tests/storage.test.js`; PASS para fechas, autorización, persistencia y concurrencia. Probar fecha inexistente como 2026-02-30 rechazada, no normalizada silenciosamente.
- [x] **Paso 5:** Commit selectivo `feat: persist opportunities and application history`.

### Tarea 7: Integración del frontend existente

**Files:** modificar src/services/api.ts, src/types/index.ts, src/pages/AuthPages.tsx, src/pages/StudentPages.tsx, src/pages/PublicPages.tsx, vite.config.ts, package.json; crear playwright.config.js, tests/e2e/fixtures.js, flows.spec.js y errors.spec.js. Configuración local ignorada.

**Interfaces:** conservar métodos api existentes; añadir `api.uploadCV(file:File):Promise<User>`, `api.uploadImage(file:File):Promise<User>` si no se convierte desde updateProfile. `api.verifyEmail(token)` usa POST. updateProfile mantiene adaptación de fotos data URL con subida real y PUT de campos permitidos. API_URL=/api, cookies include; multipart sin cabecera JSON; 409/429 con mensaje público y retryAfter cuando corresponda.

- [x] **Paso 1:** Crear fixtures Playwright con app/BD/correo de pruebas, usuarios con estados requeridos y acceso a outbox solo desde proceso de test. Escribir recorridos `register_both_domains`, `verify_and_approve_company`, `publish_upload_apply_review_and_close`, `reload_keeps_profile_and_cv`, `session_expiry_redirects_once`, `retry_preserves_form`. Assertar mismos destinos actuales, bytes de CV real, convenio vigente en detalle, historial cerrado, errores sin perder datos y ausencia de enlace demo en API real. Ejecutar `npx playwright test tests/e2e/flows.spec.js tests/e2e/errors.spec.js` con servidor de pruebas configurado y confirmar FAIL por frontend aún simulado.
- [x] **Paso 2:** Conectar proxy /api sin tocar plugins Figma, helper request con headers correctas y servicios reales; no fallback silencioso a mocks cuando el backend falla. En modo demo conservar funciones de prueba solo si explícitamente habilitado; modo normal siempre API. Cambiar ruta companys a companies según tarea 4. getSession/login/register actualizan marcador de sesión para detectar expiración; 401 en registro/verificación pública no dispara sesión vencida. Verificar correo sincroniza usuario solo si DTO corresponde a sesión actual.
- [x] **Paso 3:** Conectar uploadCV con File y usuario/URL devueltos, liberar previews blob al reemplazar/desmontar y conservar archivo seleccionado al fallar. Ajustar mensajes y ejemplos para ambos dominios. Mostrar envío real/fallo SMTP del registro y reenvío; ocultar demostración en modo API. Agregar hasUasAgreement al tipo y detalle con textos exactos del diseño. No cambiar registro, aprobación, formularios ni navegación salvo lo necesario para contratos.
- [x] **Paso 4:** Ejecutar `npx tsc --noEmit`, `npm run build` y ambos archivos Playwright; PASS sin excepciones de consola ni peticiones a mocks en modo API. E2E usa base aislada; nunca registrar direcciones inventadas contra SMTP real.
- [x] **Paso 5:** Commit solo integración revisada. Dado que los archivos contienen cambios previos de Figma, no hacer git add indiscriminado: preservar una copia/patch base o usar hunks para registrar únicamente el cambio de integración; si se necesita incluir el estado completo para una entrega reproducible, pedir autorización específica antes de incorporar trabajo ajeno. Mensaje `feat: connect existing frontend to Express API`.

### Tarea 8: Espaciado y comprobación responsive

**Files:** modificar src/index.css; src/components/ui.tsx o páginas solo si el contenedor compartido no permite espaciado correcto. Crear tests/e2e/layout.spec.js.

**Interfaces:** `.notice` conserva colores/copy, padding aproximado 12px 16px; separación de contenido anterior/posterior con margin o gap según contenedor, sin duplicarla; `.cta-section` recupera separación superior. Modal conserva encabezado/pie visibles y scroll del cuerpo.

- [x] **Paso 1:** Capturar estado previo de portada y ficha de revisión con mensaje “El convenio se actualizó correctamente sin resolver la solicitud.”. Escribir test `review_notice_and_actions_fit_viewport` con 1366x600, 375x667 y 667x375, texto largo: acciones dentro de viewport, cuerpo con scroll si hace falta y sin overflow horizontal. Comprobar espaciado del aviso antes/después y padding interno mediante bounding boxes/computedStyle; probar equivalente de viewport al 200% y revisar zoom real visualmente cuando disponible.
- [x] **Paso 2:** Ejecutar `npx playwright test tests/e2e/layout.spec.js`; comprobar qué aserciones fallan y limitar cambios a problemas reproducidos. No exigir que el modal existente falle si ya funciona.
- [x] **Paso 3:** Ajustar CSS de avisos en contextos con/sin gap y CTA superior, iconos no encogidos y wrapping. Mantener altura de modal mediante 100dvh, min-height:0 y pie fijo dentro del flex si la prueba identifica regresión. Evitar <br> o texto vacío para simular separación.
- [x] **Paso 4:** Repetir layout.spec.js e inspeccionar capturas desktop/móvil y zoom; PASS y avisos separados de texto/botones sin rediseño. Repetir build solo si cambió JSX.
- [x] **Paso 5:** Commit selectivo `fix: space notices and homepage call to action` respetando cambios preexistentes según tarea 7.

### Tarea 9: Entrega local, documentación y comprobación completa

**Files:** crear backend/README.md y .env.example, ampliar scripts y documentación SQL/almacenamiento; actualizar estado de tareas en este plan. No incluir secretos.

**Interfaces:** scripts backend `dev`, `start`, `test`, `db:inspect`, `db:migrate`, `db:seed`, `mail:check`; root `dev:backend`, `test:backend`, `test:e2e`. Documentar arranque frontend ya existente y backend puerto 3001, FRONTEND_URL real, DATABASE_URL/TEST_DATABASE_URL, JWT_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD, EMAIL_USER/EMAIL_PASSWORD, STORAGE_DRIVER, STORAGE_LOCAL_DIR, AWS_REGION/S3_BUCKET y credenciales estándar opcionales.

- [x] **Paso 1:** Documentar instalación, migración conservadora/baseline, semilla admin y demos explícitos, SQL de instalación solo para base vacía, ejecución/tests, copia de seguridad de archivos locales y configuración S3 privada. Explicar que cambio de driver conserva referencias anteriores pero no migra objetos automáticamente, y que TLS/cookies/proxy deben configurarse al desplegar.
- [x] **Paso 2:** Configurar .env local con credenciales proporcionadas, JWT aleatorio y almacenamiento local; no imprimir ni commitear valores. Arrancar únicamente backend si Vite ya está disponible. Probar /health, login/registro y lectura persistente con configuración local; usar datos de prueba identificables sin limpiar datos preexistentes.
- [x] **Paso 3:** Ejecutar una vez suite backend completa (`npm --prefix backend test`), TypeScript (`npx tsc --noEmit`), build y suite Playwright (`npx playwright test`). Si fallan, diagnosticar y corregir el alcance concreto antes de repetir afectados; no afirmar que pasa una dependencia externa no disponible.
- [x] **Paso 4:** Revisar diff final contra copia inicial: flujos conservados, secretos ausentes en archivos versionables, SQL coincide con Prisma, ni reset ni DROP en scripts de instalación, navegador usa API y evidencia visual de avisos/CTA/convenio. Solicitar revisión de código según habilidad de revisión en la ejecución; resolver hallazgos antes de declarar entrega.
- [x] **Paso 5:** Commit selectivo `docs: document local backend and S3 configuration`; entregar rutas de documentación/SQL, comandos de arranque, resultados reales y límites (SMTP/S3 reales solo si probados). No hacer push, desplegar ni mezclar cambios ajenos como efecto secundario.

## Autorrevisión del plan

Cobertura: autenticación y catálogo (2), correo (3), perfiles/archivos/S3 (4), admin (5), convocatorias/postulaciones (6), integración y sesión/errores (7), espaciado/responsive (8), migración/SQL (1), entrega/pruebas (9). Los cinco riesgos de Review Focus tienen aserciones en sus tareas. IDs, carreras y DTO se mantienen compatibles con frontend; verificación usa POST de API preservando URL de pantalla. Cualquier limitación externa se reporta sin desactivar permisos ni sustituir persistencia por mocks.

