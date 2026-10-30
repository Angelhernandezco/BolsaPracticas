# Careers, Dated Agreements and Frontend Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir gestión administrativa de carreras y convenios por fechas, notificar aprobaciones, entregar semillas SQL reproducibles y separar frontend/backend conservando los flujos actuales.

**Architecture:** Paquetes frontend/ y backend/ con comandos de coordinación en raíz. Ampliar los módulos Express actuales y reutilizar componentes Figma; las fechas se persisten sin estado derivado, la interfaz calcula vigencia local y el correo utiliza Mazatlán. Las semillas parten de un manifiesto compartido y el correo de aprobación tiene un registro persistido para reintentos.

**Tech Stack:** React 19, TypeScript 5.7, Vite 8, Tailwind 4; Node 22.16, Express JavaScript ESM, Prisma 6.19, PostgreSQL, Nodemailer; node:test, Supertest, Playwright y oxfmt existentes. Sin nuevas dependencias de producción.

**Spec:** docs/superpowers/specs/2026-10-29-careers-agreements-frontend-design.md

## Global Constraints

- “El backend sigue en Express JavaScript y el frontend en React TypeScript.”
- “No ejecutar la refactorización general anterior, que quedó sin aprobación. No hacer merge ni push.”
- “Conservar los cambios locales existentes, incluidos archivos aún sin commit.”
- “Ningún dato de prueba existente debe borrarse por esta solicitud: el usuario pidió incorporarlos al SQL, no limpiar bases.”
- “Permitir crear, cambiar de nombre, desactivar y reactivar carreras. No añadir eliminación.”
- “Los nombres deben ser únicos entre todas las carreras, activas o inactivas.”
- “Pareja opcional: ambas null o ambas fechas completas. Inicio menor o igual a fin.”
- “El último día es inclusivo.”
- “No almacenar un campo de estado/vigencia ni boolean derivado en la tabla empresarial.”
- “No se modifica la regla de vencimiento de convocatorias, que sigue en Mazatlán.”
- “No incluir credenciales reales, administrador privado, sesiones válidas ni tokens de verificación.”
- Los endpoints existentes conservan URL. El cambio de payload de convenio y los nuevos campos/rutas están autorizados por el diseño; no agregar funciones ajenas.

## Review Focus

- Carrera desactivada o renombrada con perfiles/formularios abiertos: conservar sus relaciones por ID y permitir guardar otros datos sin reasignarla ni recrearla (tareas 2–3).
- Unicidad concurrente y semillas repetidas después de edición administrativa: no aceptar duplicados ni restaurar nombres/estados anteriores (tareas 2 y 7).
- Navegador en otro huso horario o pestaña abierta durante medianoche: estado local correcto y actualizado, sin cambiar las fechas ni afectar el plazo de convocatorias (tarea 5).
- SMTP fallido o respuesta perdida después de aprobación: conservar aprobación, identificar envío pendiente y evitar otro correo por repetir la decisión (tarea 6).
- Separación de carpetas y SQL de demostración: recursos PDF, rutas profundas, proxy y permisos siguen funcionando desde una instalación limpia (tareas 1, 7 y 8).

---

## Mapa de archivos y contratos compartidos

Mover a frontend/ los archivos de aplicación: src/, public/, index.html, vite.config.ts, tsconfig.json, .env.example y .env.local ignorado. Mover la configuración Figma requerida (.figma/make/site.json) con su importación; conservar herramientas/metadatos del entorno en raíz. Crear frontend/package.json y su lockfile a partir de dependencias actuales. Raíz conserva package.json de coordinación, Playwright y tests/e2e; backend conserva su paquete/lockfile y archivos de almacenamiento.

Modificar backend/prisma/schema.prisma y crear migraciones 202610290003_careers y 202610290004_agreements_notifications. Añadir backend/src/modules/careers/{routes,service}.js; backend/src/lib/agreements.js; backend/src/services/approval-notifications.js. Ampliar admin, auth, catalogs, profiles, opportunities, mail y serializers existentes sin reescribir otros módulos.

Crear frontend/src/pages/admin/AdminCareersPage.tsx; frontend/src/components/{CareerForm,AgreementDatesFields,AgreementBadge}.tsx; frontend/src/lib/agreements.ts; frontend/src/hooks/useLocalCalendarDate.ts. Modificar frontend/src/pages/{AdminPages,AuthPages,CompanyPages,StudentPages,PublicPages}.tsx solo donde consuman carreras/convenios, frontend/src/services/api.ts, types/index.ts, app/routes.tsx y layouts/DashboardLayout.tsx. CSS únicamente para columnas/controles nuevos usando patrón existente.

Crear fixtures/seed-data.json como fuente de datos de demostración/catálogos, consumida por scripts backend y mocks frontend; permitir en Vite solo ese directorio compartido si hace falta. Crear backend/prisma/seed-data.js (adaptación al modelo), backend/scripts/{generate-install-sql,prepare-demo-assets}.js y ampliar seed.js/seed-demo.js. Generar backend/sql/bolsa_practicas.sql desde migraciones/modelo más manifiesto, no mantener dos datasets a mano.

Crear backend/tests/{careers,agreements,approval-notifications,sql-seeds}.test.js; ampliar auth/admin/opportunities/seed-demo/storage y helpers. Crear tests/e2e/{careers,agreements}.spec.js; adaptar flows/layout/fixtures y servidor E2E. No añadir runner frontend nuevo: utilidades TypeScript se prueban a través de Playwright y del navegador.

Contratos:
- `CareerDto = { id: string; name: string; active: boolean }`.
- `AgreementDates = { agreementStartDate: string | null; agreementEndDate: string | null }` en User/CompanyReview/Opportunity. Eliminar hasUasAgreement de código activo y mocks; migraciones históricas permanecen intactas.
- `AgreementStatus = "none" | "upcoming" | "active" | "expired"`, solo derivado. Labels Sin convenio / Próximo a iniciar / Activo / Vencido.
- DTO de perfil agrega `careerId: string`; DTO de convocatoria agrega `careerAssociations: CareerDto[]`, conservando `career` y `careerIds` (nombres) actuales. Formularios guardan las identidades estables; payload admite `careerId` en perfil y `careerRecordIds: string[]` en convocatoria. Mantener compatibilidad de payloads por nombre cuando no se envíen IDs; nunca dejar que un nombre viejo reasigne otro registro.
- `ApprovalNotificationDto = { status: "pending" | "sending" | "sent" | "failed"; sentAt: string | null } | null`, solo en CompanyReview. No exponer destinatarios internos, errores SMTP crudos ni tokens.

### Task 1: Separar frontend sin modificar comportamiento

**Files:** mover archivos descritos en el mapa; modificar package.json raíz, playwright.config.js, backend/src/app.js, backend/prisma/seed-demo.js, backend/tests/database.test.js, tests/e2e/flows.spec.js y backend/README.md; crear frontend/package.json/lockfile y README.md raíz.

**Interfaces:** raíz `dev`, `build`, `typecheck`, `format` delegan a frontend; `dev:backend`, `test:backend`, `test:e2e` conservan uso. Express sirve frontend/dist; PDF demo queda en frontend/public/demo-cv.pdf; URLs y puertos actuales se conservan.

- [ ] **Step 1: Baseline y protección.** Leer estado Git, registrar branch/BASE y copia/diff de archivos locales en workspace del plan. Ejecutar antes de cambios `npm run typecheck`, `npm run build`, `npm run test:backend` y `npm run test:e2e`; comparar con última evidencia 40 backend/12 E2E, sin asumir esos conteos. No ejecutar tests contra la base de usuario.
- [ ] **Step 2: Prueba RED.** Añadir `frontend_package_build_and_static_routes_work` a database.test.js, verificando `frontend/dist/index.html` y GET /registro HTML, /api/health JSON, PDF demo disponible; ejecutar `npm run build` y ese test con ruta nueva para observar fallo de carpeta/ruta inexistente, no de lógica.
- [ ] **Step 3: Movimiento.** Verificar rutas absolutas origen/destino dentro del repo antes de cada movimiento. Mover, no regenerar componentes. Actualizar alias/configuración Figma, proxy, rutas de build/PDF y cwd/comandos Playwright. Instalar dependencias desde lockfiles del paquete sin copiar node_modules. Mantener .env local ignorado sin mostrar su contenido. Raíz mantiene únicamente coordinación/pruebas.
- [ ] **Step 4: GREEN.** Desde raíz ejecutar typecheck/build y ambas suites; desde frontend ejecutar `npm run build` y `npm run typecheck`. Esperar las mismas funciones aprobadas, sin 404 de assets, rutas profundas o CV ni cambios visuales de portada/modal. Ejecutar E2E con árbol estable, sin builds/ediciones concurrentes que provoquen recargas.
- [ ] **Step 5: Registro.** Guardar evidencia y commit selectivo `chore: separate frontend and backend packages`. No incorporar cambios previos de Figma como autoría propia; si los movimientos impiden aislarlos de forma segura, conservar los archivos completos sin staging y dejarlo registrado, sin merge/push.

### Task 2: Carreras persistentes, únicas y con relaciones conservadas

**Files:** schema.prisma; migración careers; módulos careers, catalogs/routes.js, auth/service.js, profiles/service.js, opportunities/{service,serializers}.js, lib/serializers.js; seed.js y tests/careers.test.js.

**Interfaces:** GET /api/admin/careers -> CareerDto[]; POST /api/admin/careers `{name}` -> CareerDto (201); PATCH /api/admin/careers/:id `{name?,active?}` -> CareerDto. Solo admin verificado. GET /api/catalogs/careers sigue string[] activo. Carrera usa `active @map("activo")` y `seedKey String? @unique @map("clave_semilla")` para identidad estable de semillas.

- [ ] **Step 1: RED de administración.** Escribir `admin_creates_renames_deactivates_reactivates`, `normalized_name_unique_even_inactive`, `concurrent_duplicate_creation_conflicts`, `non_admin_cannot_manage`. Aserciones: create 201, editar propio nombre sin cambio 200, duplicados tras trim/lowercase 409 incluidos inactivos, dos POST equivalentes => uno 201 y otro 409, estudiantes/empresas 403.

```js
assert.equal(created.status, 201);
assert.equal(duplicateWithDifferentCase.status, 409);
assert.deepEqual(concurrentResponses.map(response => response.status).sort(), [201, 409]);
assert.equal(savedUnchangedName.status, 200);
```
- [ ] **Step 2: RED de preservación.** Escribir `inactive_existing_relations_remain_editable` y `renamed_career_preserves_foreign_keys`: registro/asociación nueva inactiva 422; guardar teléfono/perfil con ID actual inactivo 200; convocatoria conserva relación inactiva preexistente; cambio de nombre no cambia careerId ni tabla puente. Formularios con nombre antiguo y ID válido siguen referenciando la misma carrera. Ejecutar `node --env-file=.env.test --test tests/careers.test.js` desde backend; esperar fallo por rutas/reglas ausentes.
- [ ] **Step 3: Implementación.** Inspeccionar duplicados existentes con `lower(btrim(nombre))` antes de DDL. Migración añade activo default true, seedKey nullable y UNIQUE INDEX funcional sobre lower(btrim(nombre)); conserva UNIQUE original y no fusiona registros. Backfill seedKey solo para coincidencias inequívocas de catálogos originales. Validar nombre trim no vacío, máximo120; manejar unicidad PostgreSQL aunque haya carrera concurrente. Validar selección activa o misma relación previa bajo transacción/bloqueos que serialicen desactivación con nuevas asociaciones; no recrear/eliminar relaciones al renombrar. Semilla reconoce seedKey y nunca restaura nombre/activo de filas existentes.
- [ ] **Step 4: GREEN.** Ejecutar careers.test.js y suite backend completa adaptando fixtures existentes cuando sea estrictamente necesario; verificar catálogo renombrado y reactivado, relaciones intactas y errores 409 comprensibles. SQL de migración conserva datos y rechaza colisiones detectadas sin corregirlas automáticamente.
- [ ] **Step 5:** Commit selectivo `feat: manage unique active and inactive careers`; ledger con evidencia y BASE.

### Task 3: Módulo administrativo y selectores de carreras

**Files:** crear AdminCareersPage.tsx y CareerForm.tsx; modificar frontend types/api/routes/DashboardLayout y selectores de AuthPages/StudentPages/CompanyPages; crear tests/e2e/careers.spec.js.

**Interfaces:** `api.listCareers():Promise<CareerDto[]>`, `api.createCareer(name):Promise<CareerDto>`, `api.updateCareer(id,{name?,active?}):Promise<CareerDto>`; conservar api.getCareers() de nombres activos y métodos de registro/perfil/convocatoria, enviando IDs estables cuando ya se dispone de ellos. Ruta /admin/carreras.

- [ ] **Step 1: RED.** E2E `admin_career_lifecycle`: crear, renombrar, desactivar, filtrar inactivas, reactivar y comprobar opciones de registro en otra sesión; nombre duplicado muestra error y conserva formulario. `existing_inactive_selection_is_visible_and_preserved`: perfil/convocatoria previa muestran nombre con indicador Inactiva y guardan otros campos sin perder vínculo. `non_admin_career_route_denied`: mismos guardas de rol. Ejecutar archivo nuevo; esperar fallo por pantalla ausente.
- [ ] **Step 2: Pantalla.** Usar AdminHeader/Title/Card/Input/Badge/Modal/QueryError del patrón actual. Columnas Nombre/Estado/Acciones; búsqueda y filtro Activo/Inactivo; modal crear/editar nombre y confirmación de desactivación; acción reactivar para inactivas. Carga, error/reintento y estado vacío coherentes, sin permitir borrado.
- [ ] **Step 3: Integración.** Añadir enlace/guardas y métodos de API con mocks equivalentes mientras el modo demo explícito siga existiendo. Incorporar opción inactiva actual únicamente al formulario dueño de esa relación; nuevas selecciones reciben activas. Mantener identidad de carrera al editar aunque se renombre en otra sesión y refrescar catálogo tras conflictos. No introducir biblioteca de formularios.
- [ ] **Step 4: GREEN.** Ejecutar careers.spec.js, typecheck y suite E2E actual; confirmar persistencia tras recarga y mismo estilo en escritorio/móvil.
- [ ] **Step 5:** Commit selectivo `feat: add administrative careers module` y evidencia.

### Task 4: Convenios por fechas en base de datos y API

**Files:** schema.prisma; migración agreements_notifications; lib/agreements.js; módulos admin/routes/service, perfiles y serializadores User/Opportunity; prisma/seed-demo.js para sustituir su boolean por fechas antes de consolidarlo en tarea7; tests/agreements.test.js, admin.test.js y fixtures/helpers; definición futura de notificación usada en tarea6.

**Interfaces:** PATCH /api/admin/companies/:id/uas-agreement recibe AgreementDates y devuelve CompanyReview; POST /api/admin/companies/:id/decision recibe `{decision,reason?,agreementStartDate?,agreementEndDate?}`. Si no incluye campos fecha, conserva fechas actuales; si incluye, exige ambos, incluso para borrar. `validateAgreementDates(input) -> {agreementStartDate:Date|null,agreementEndDate:Date|null}` y `agreementStatusOn(dates,today:string) -> AgreementStatus`, helper backend solo para correo.

- [ ] **Step 1: RED.** Tests `dates_are_optional_as_a_pair`, `invalid_and_reversed_calendar_dates_rejected`, `only_admin_edits_dates`, `decision_and_dates_are_atomic`. Aserciones: null/null y 2026-10-29/2026-10-29 aceptados; solo un campo, 2026-02-30 o fin anterior =>422; escritura directa SQL de pareja inválida falla CHECK; perfil empresarial no altera fechas; decisión inválida no persiste fechas. Ejecutar agreements.test.js antes de implementar.

```js
assert.equal(withNullPair.status, 200);
assert.equal(withOnlyStart.status, 422);
assert.equal(withImpossibleDate.status, 422);
assert.deepEqual(savedAfterRejectedDecision, datesBeforeDecision);
```
- [ ] **Step 2: Migración.** Añadir columnas DATE nullable y CHECK de pareja/orden; eliminar tiene_convenio solo en la nueva migración. Añadir `ApprovalNotification`/tabla notificacion_aprobacion, una por empresa, con recipient, period snapshot DATE null, status pending/sending/sent/failed, createdAt, sentAt, claimToken y leaseUntil para tarea6. Estas propiedades no son vigencia de convenio ni se guardan como estado empresarial. Periodos existentes quedan null, sin inventar fechas. Conservar usuarios/datos y migraciones históricas.
- [ ] **Step 3: API.** Reutilizar parseCalendarDate para fechas reales. Serializar YYYY-MM-DD|null en empresa y convocatoria. Rechazar payload antiguo `hasUasAgreement` con422 en endpoint específico; ignorarlo y prohibir privilegios en perfil genérico como antes. Resolver decisión+fechas+evento pendiente en misma transacción y capturar destinatario/periodo final para la futura notificación. Rechazo no crea evento de aprobación. Admin lista expone estado de notificación, sin errores internos.
- [ ] **Step 4: GREEN.** Ejecutar agreements/admin y suite backend, sustituyendo fixtures del boolean por fechas. Probar que no hay columna de estado de convenio, que get/list no usan reloj para alterar fechas y que las fechas null se conservan tras migración.
- [ ] **Step 5:** Commit selectivo `feat: replace agreement flag with optional calendar dates` y evidencia.

### Task 5: Tres columnas y vigencia calculada por navegador

**Files:** frontend lib/agreements.ts, hooks/useLocalCalendarDate.ts, components/AgreementDatesFields.tsx y AgreementBadge.tsx; AdminPages, CompanyPages, PublicPages, AuthPages, types/api y CSS de columnas; tests/e2e/agreements.spec.js y adaptar flows/layout.

**Interfaces:** `getAgreementStatus(dates:AgreementDates,today:string):AgreementStatus`; `useLocalCalendarDate():string` usa calendario local; `AgreementDatesFields({value,onChange,disabled?,optionalHint?})`; `AgreementBadge({dates,today})`. `api.setCompanyAgreement(id,dates,admin)` conserva nombre y URL; `api.resolveCompany(id,decision,reason,admin,dates?)` incorpora par en una sola petición cuando se resuelve.

- [ ] **Step 1: RED de fechas.** E2E `browser_timezone_determines_agreement_state`: instante fijo 2026-10-30T00:30Z, periodo 2026-10-29/2026-10-29; Los_Angeles muestra Activo y Asia/Tokyo Vencido. `last_day_inclusive_and_midnight_refresh`: día final activo; avanzar reloj al día siguiente actualiza sin recargar; focus/visibility también actualiza. Probar periodo futuro y null/null. Usar Playwright clock/timezoneId, sin reloj backend como fuente UI.

```ts
await expect(losAngelesPage.getByText("Activo", { exact: true })).toBeVisible();
await expect(tokyoPage.getByText("Vencido", { exact: true })).toBeVisible();
```
- [ ] **Step 2: RED de UI.** Tests tabla con tres columnas exactas Inicio de convenio / Fin de convenio / Estado del convenio, sin checkbox. Ficha muestra texto opcional y envía ambas fechas junto con decisión; guardar solo fechas no resuelve ni manda correo. Par incompleto conserva valores y muestra error. Tabla, perfil empresarial, estado de solicitud y detalle estudiante muestran mismas fechas/estado. Ejecutar antes de reemplazar controles actuales.
- [ ] **Step 3: Implementar utilidades.** Obtener hoy con getFullYear/getMonth/getDate del navegador; comparar cadenas YYYY-MM-DD; representar fechas sin UTC shift. Programar siguiente medianoche local, añadir foco/visibilitychange y limpiar timers/listeners al desmontar; no aplicar esta utilidad al plazo de convocatoria de Mazatlán.
- [ ] **Step 4: GREEN de integración.** Modal de edición de par con guardar/cancelar/borrar ambas, campos opcionales en ficha, badge y aviso vencido/próximo. Eliminar boolean de tipos/API/mocks/vistas activas. Conservar layout general y añadir solo columnas/controles. Ejecutar agreements.spec.js y E2E completa, typecheck/build; adaptar layout.spec para rellenar fechas en lugar del checkbox y comprobar pies visibles en 1366x600, 375x667, 667x375 y 683x300.
- [ ] **Step 5:** Commit selectivo `feat: display agreement dates and browser-local status` y evidencia.

### Task 6: Correo de aprobación persistido y reintentable

**Files:** services/approval-notifications.js, services/mail.js, módulos admin/service/routes, serializers, frontend AdminPages/types/api; tests/approval-notifications.test.js y helpers/E2E mailer.

**Interfaces:** `mailer.sendCompanyApproval({to,companyName,loginUrl,agreementStartDate,agreementEndDate,status,referenceDate,timezone}) -> Promise<void>`; `dispatchApprovalNotification(companyUserId) -> ApprovalNotificationDto`; POST /api/admin/companies/:id/approval-notification/retry solo admin. Resolución devuelve CompanyReview con approvalNotification; envío falla sin cambiar HTTP de aprobación exitosa ni afirmar entrega.

- [ ] **Step 1: RED de contenido.** Tests con correo capturable: `approval_email_has_account_recipient_and_saved_dates`, `email_covers_all_four_agreement_states`, `rejection_and_date_only_updates_send_no_approval_mail`. Reloj fijo 2026-10-30T06:30Z => fecha referencia Mazatlán2026-10-29. Destino correo de cuenta, enlace FRONTEND_URL/iniciar-sesion. Activo incluye ambas fechas; vencido/futuro avisan y sin activo incluyen exactamente “Los estudiantes que se postulen podrán proporcionarte más información sobre el proceso de convenio”. No horas en fechas. Ejecutar antes de implementar envío.
- [ ] **Step 2: RED de recuperación.** `smtp_failure_preserves_approval_and_retry_sends`, `repeated_decision_does_not_duplicate_notification`, `parallel_retries_claim_once`, `expired_send_lease_can_recover`. Aserciones: aprobar crea evento, fallaSMTP => approved+failed; reintento => sent; recarga/repeticióndecisión no genera otro evento; dos reintentos simultáneos un envío; lease vencido se puede reclamar tras caída de proceso. Nunca pruebas contra SMTP de destinatarios ficticios.

```js
assert.equal(approvedAfterSmtpFailure.approvalStatus, "approved");
assert.equal(approvedAfterSmtpFailure.approvalNotification.status, "failed");
assert.equal(afterRetry.approvalNotification.status, "sent");
assert.equal(capturedApprovalMessages.length, 1);
```
- [ ] **Step 3: Entrega.** Crear claim atómico condicionado a pending/failed o sending con lease vencido; claimToken único y lease de 60s (mayor que socketTimeout20s). Enviar fuera de transacción con snapshot del periodo al aprobar y fecha de referencia Mazatlán al intentar envío; guardar resultado solo si sigue siendo dueño del claim. Una entrega SMTP aceptada seguida de caída antes de persistir puede repetirse al recuperar lease: documentar límite, no prometer exactly-once. No inferir errorSMTP como aprobaciónfallida. No añadir worker o dependencia de colas.
- [ ] **Step 4: GREEN/UI.** Admin ve pendiente/fallido y botón reintentar en detalle aprobado; sent no admite otro envío. Actualizar mailers de tests y E2E para capturar ambos tipos de mensaje sin exponer outbox en API normal. Ejecutar approval-notifications.test.js y suite backend; E2E aprueba con fechas, inspecciona outbox y comprueba estado de solicitud del usuario.
- [ ] **Step 5:** Commit selectivo `feat: notify approved companies with agreement information` y evidencia.

### Task 7: SQL y todas las semillas fijas reproducibles

**Files:** fixtures/seed-data.json; prisma/seed-data.js, seed.js, seed-demo.js; scripts/generate-install-sql.js y prepare-demo-assets.js; sql/bolsa_practicas.sql; mocks frontend/api; helpers y E2E server; tests/sql-seeds.test.js y seed-demo.test.js; README.

**Interfaces:** `loadSeedData() -> SeedManifest`; `seedCatalogs(prisma,manifest)`, `seedDemo(prisma,manifest,{referenceDate,storage})`; `renderSeedSql(manifest,{referenceDate}) -> string`; `prepareDemoAssets(prisma,storage) -> result`. Scripts `db:sql:generate` y `db:seed:assets` en backend. Manifiesto contiene claves estables, hashes de contraseñas demo públicas y fechas de referencia configurables, sin secretos reales. Catálogos se reconocen por seedKey; cuentas/relaciones demo nuevas conservan política de omitir ante correos reservados preexistentes.

- [ ] **Step 1: RED de consistencia.** Tests `sql_and_javascript_seed_same_fixed_scenarios`, `sql_demo_cv_bytes_are_prepared`, `renamed_inactive_seed_career_is_not_recreated`, `seed_collision_never_mutates_existing_accounts`. Instalar SQL en esquema nuevo de BD _test; comparar perfiles/roles/carreras/convocatorias/relaciones con semilla JS del mismo manifiesto y referenceDate fija. Comparar claves semánticas, no IDs generados ni timestamps. Hashes demo se validan con bcrypt.compare; ninguna sesión/token real sembrado.
- [ ] **Step 2: Consolidar dataset.** Reunir roles/carreras/demoAPI/seed-demo/cuentas E2E fijas en manifiesto único, con correos/RFC únicos, estados verificación/aprobación, candidatos y CV. Incluir carrera inactiva y convenio none/active/expired/upcoming; evaluar fechas relativas a referenceDate y renderizar fechas explícitas en SQL, comentando fecha de generación. Datos aleatorios de ejecuciones previas no se exportan. Consumir manifiesto desde mocks sin habilitar bypass en API real.
- [ ] **Step 3: Generar SQL/recursos.** Crear DDL desde esquema/migraciones finales, añadir índice funcional y CHECK no representados por Prisma y sección demo marcada. SQL instalación solo para BD nueva, referencias deterministas por seedKey/email y sin DROP TABLE de negocio. Preparar bytes del PDF incluido para las claves locales del manifiesto; no sobreescribir archivos existentes ni simular que el SQL restaura bytes. Mantener assets demo separados de almacenamiento de usuarios.
- [ ] **Step 4: GREEN.** Ejecutar sql-seeds/seed-demo y suite backend; comparar Prisma diff sin cambios estructurales; consultar CV sembrado con estudiante/empresa autorizados. Repetir semilla tras renombrar/desactivar una carrera: ni recrea antiguo nombre ni revierte cambios. Documentar generación, fecha de referencia, importación y preparación de assets; proteger todas las pruebas con assertTestDatabase.
- [ ] **Step 5:** Commit selectivo `feat: include reproducible demo seeds in installation SQL` y evidencia. No volcar bases reales ni contraseñas/tokens privados.

### Task 8: Verificación completa y entrega

**Files:** ampliar tests/e2e/{careers,agreements,flows,errors,layout}.spec.js y README raíz/backend; crear docs/superpowers/reports/2026-10-29-careers-agreements-frontend.md; actualizar checkboxes del plan al concluir.

**Interfaces:** comandos desde raíz y paquetes documentados; rutas navegador anteriores más /admin/carreras; puerto frontend8443/backend3001 conservados; frontend/dist soportado por Express. Datos/secretos actuales quedan locales y fuera de Git.

- [ ] **Step 1: Extender aceptación.** Comprobar identidad tras renombrado concurrente, carreras inactivas en formularios antiguos, convenio con zona horaria diferente y cambio de día, aprobación con fechas persistidas y correo recuperable. Capturar tabla de tres columnas y ficha/carreras en móvil y escritorio; conservar casos originales de login/CV/postulación/cierre/historial/sesión vencida.
- [ ] **Step 2: Ejecutar.** Con fuentes estables correr `npm run test:backend`, `npm run typecheck`, `npm run build`, `npm run test:e2e`; esperar cero fallos, sin fijar conteos antiguos. Validar SQL de instalación+semillas en otra base aislada y comparar modelo. No correr builds/escrituras de fuente en paralelo con E2E por recargas de Vite.
- [ ] **Step 3: Revisión.** Usar revisión independiente final de solo lectura, con spec, plan, diff propio y ledger. Corregir hallazgos importantes con reproducción RED→GREEN y suite; preservar trabajo previo del usuario y no usar secretos en paquetes de revisión.
- [ ] **Step 4: Documentar.** Registrar resultados reales, ruta de semillas/assets y diferencias de reloj UI/correo/convocatorias. Explicar que convenios legados quedan sin fechas hasta captura administrativa y el límite de SMTP ante caída tras aceptación. No afirmar entrega real, S3 ni despliegue no comprobados.
- [ ] **Step 5: Entregar.** Mantener rama local y app lista en sus comandos actualizados; commits solo propios, sin merge/push. Reportar pruebas, limitaciones y archivos clave; no pedir aprobación intermedia entre tareas durante la ejecución directa ya elegida salvo operación destructiva o conflicto de datos que la requiera.

## Autorrevisión

Cobertura: traslado y ejecución (1), carreras/IDs/semillas estables (2–3,7), fechas/validación/persistencia (4), columnas/estado local/ficha (5), correo/resolución/reintento (6), SQL/fixtures/CV (7), pruebas/estilos/entrega (8). Cada Review Focus tiene pruebas en tarea dueña. Los nombres de contratos/fechas son consistentes; no se deriva vigencia de convenio en la BD ni se cambia la regla de fecha de convocatoria. La refactorización general sigue excluida.
