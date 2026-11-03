# Registro, verificación y Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validar registro y edición, corregir la primera verificación de correo y entregar Docker Compose reproducible con SQL de instalación coherente.

**Architecture:** Mantener React/Vite y Express/Prisma, con validadores reutilizables dentro de cada paquete. Nginx sirve React y redirige /api a Express; Compose coordina PostgreSQL, migración y aplicación con volúmenes persistentes.

**Tech Stack:** React 19, TypeScript, Vite 8, Node 22 Alpine, Express 5, Zod 4, Prisma 6.19, PostgreSQL, Nginx Alpine, node:test, Supertest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-registro-verificacion-docker-design.md`

## Global Constraints

- Teléfono opcional: exactamente 10 dígitos ASCII cuando no esté vacío.
- Matrícula: 1 a 20 dígitos ASCII; conservar ceros iniciales.
- RFC: 12 o 13 posiciones, fecha AAMMDD válida, mayúsculas; sin consulta al SAT.
- Mantener tokens de uso único, sesiones ajenas y caducidad de 24 horas.
- Node 22 Alpine; frontend Nginx Alpine; puertos externos 8080 y 3000.
- Mantener DATABASE_URL y sesiones de ocho horas. Secretos fuera de imágenes.
- No sobrescribir .env actuales ni ejecutar SQL de creación sobre una BD existente.
- No publicar en ECR ni desplegar AWS.

## Review Focus

- Entradas API directas deben recibir 422 aunque se omita la UI; cubrir Task 1.
- Teléfono vacío/null al editar debe conservar el carácter opcional; cubrir Task 1.
- Fecha de RFC imposible o 29 de febrero debe evaluarse por calendario; cubrir Task 1.
- Remontaje de StrictMode y reintento tras fallo de red no deben ocultar el éxito ni bloquear reintentos; cubrir Task 2.
- Arranque frío, rutas React, cookies HTTP local y volúmenes al recrear contenedores; cubrir Task 4.

## Task 1: Formatos en registro y edición

**Files:**
- Create: `backend/src/lib/registration-validation.js`, `frontend/src/lib/registration-validation.ts`.
- Modify: `backend/src/modules/auth/schemas.js`, `backend/src/modules/profiles/service.js`.
- Modify: `frontend/src/pages/AuthPages.tsx`, `frontend/src/pages/StudentPages.tsx`, `frontend/src/pages/CompanyPages.tsx`, `frontend/src/services/api.ts` (paridad modo demo).
- Test: `backend/tests/registration-validation.test.js`, `backend/tests/auth.test.js`, `tests/e2e/registration-validation.spec.js`.
- Modify test data: `backend/tests/helpers.js`, los casos E2E que construyan identificadores inválidos.

**Interfaces:** Backend exporta `phoneSchema`, `matriculaSchema`, `rfcSchema` basados en Zod. Frontend exporta `phoneError(value: string): string`, `matriculaError(value: string): string`, `rfcError(value: string): string`; cadena vacía significa sin error. Normalizar trim; RFC uppercase. Teléfono vacío aceptado, null solo donde el perfil ya lo admite.

- [x] Escribir casos RED: matrícula `00 123`, `ABC`, vacía, >20 rechazadas y `00123456` preservada; teléfonos de 9/11 dígitos, letras, espacios internos y `+52` rechazados; vacío aceptado; RFC moral/físico aceptado y fecha `991332` rechazada, con casos bisiestos.
- [x] Ejecutar `node --test backend/tests/registration-validation.test.js` sin BD. Expected: las aserciones nuevas fallan por reglas ausentes; mantener primero pruebas sobre esquemas existentes para observar fallo de comportamiento.
- [x] Implementar validadores y reutilizarlos en schemas de registro/perfil; añadir mensajes claros y atributos type/inputMode/maxLength adecuados en UI, sin convertir matrícula a número.
- [x] Añadir pruebas HTTP: registro y edición rechazan entradas inválidas y aceptan opcionales; actualizar generadores de tests a matrícula numérica y RFC con fecha real y sufijo único.
- [x] Añadir E2E: la UI rechaza formatos inválidos antes de enviar el registro y permite los dos tipos de RFC; comprobar edición de los mismos campos.
- [x] Ejecutar pruebas unitarias, `npm run test:backend` y `npm run test:e2e -- tests/e2e/registration-validation.spec.js`. Expected: 0 fallos; las de integración requieren BD _test preparada.
- [ ] Revisar diff y registrar evidencia antes de commit `fix: validate registration and profile identifiers`.

## Task 2: Resultado de primera verificación

**Files:**
- Modify: `frontend/src/pages/AuthPages.tsx`, `frontend/src/app/AuthContext.tsx` (respuesta de sesión antigua que puede deshacer la verificación) y, solo si se necesita, helper de operación pendiente en `frontend/src/lib/`.
- Test: `tests/e2e/flows.spec.js` y `tests/e2e/registration-validation.spec.js` o un archivo dedicado `tests/e2e/email-verification.spec.js`.
- Existing contract tests: `backend/tests/email.test.js`.

**Interfaces:** Conservar `api.verifyEmail(token)` y resultados `success`, `already_verified`, `invalid`, `expired`. Reutilizar una operación pendiente durante el montaje, no una caché permanente del resultado por token.

- [x] Ajustar prueba existente para exigir heading exacto `Correo verificado` en la primera apertura y `Correo ya verificado` al volver a abrir el enlace; contar solicitudes de consumo por visita.
- [x] Ejecutar `npm run test:e2e -- tests/e2e/flows.spec.js --grep "register and verify"`. Expected RED: StrictMode provoca el mensaje o número de peticiones incorrecto.
- [x] Corregir la coordinación del efecto manteniendo cleanup, reintento explícito y protección contra resultados de tokens anteriores.
- [x] Probar fallo de red seguido de reintento, token inválido/vencido y navegación entre tokens. Mantener pruebas backend de concurrencia e identidad ajena.
- [x] Ejecutar casos E2E de verificación y `npm run test:backend`. Expected: primera visita exitosa, segunda ya verificada, 0 fallos.
- [ ] Revisar diff y registrar evidencia antes de commit `fix: avoid duplicate email verification requests`.

## Task 3: Semillas y SQL de instalación

**Files:**
- Modify: `fixtures/seed-data.json`, `backend/sql/bolsa_practicas.sql`.
- Test: `backend/tests/sql-seeds.test.js`, `backend/tests/seed-demo.test.js`.
- Modify if required: `backend/scripts/generate-install-sql.js`, pruebas demo que dependan de identificadores antiguos.

**Interfaces:** `npm --prefix backend run db:sql:generate` sigue generando SQL determinista desde Prisma y manifiesto compartido con referencia 2026-10-29.

- [x] Añadir comprobación de formatos para identidades y teléfonos demo usando reglas Task 1. Expected RED: fixtures contienen `DEMO-student-2`, `e2e-student`, `E2E210101ABC` y teléfonos con espacios.
- [x] Sustituir solo identificadores demo incompatibles por valores fijos válidos, distintos y reproducibles; ajustar expectativas asociadas.
- [x] Regenerar SQL con `npm --prefix backend run db:sql:generate`. Expected: script de instalación nueva coherente con manifiesto y sin secretos, sesiones ni tokens.
- [x] Comparar esquema con migraciones. No añadir migración vacía: los formatos de API no requieren nuevas columnas. Si surge cambio real de esquema, documentarlo antes de aplicarlo a datos existentes.
- [x] Ejecutar `npm run test:backend`. Expected: equivalencia entre semilla JS e importación SQL en schemas exclusivos de BD _test, 0 fallos.
- [ ] Revisar diff y registrar evidencia antes de commit `fix: align installation SQL and demo data with validation`.

## Task 4: Docker y guía de operación

**Files:**
- Create: `frontend/Dockerfile`, `backend/Dockerfile`, `frontend/nginx.conf`, exclusiones Docker específicas de los Dockerfiles o contexto raíz.
- Create: `compose.yaml`, `docker/.env.example`, `docs/docker.md`.
- Modify: `backend/src/config.js`, `backend/src/server.js`, `backend/.env.example`, `README.md`, `backend/README.md`.
- Test: `backend/tests/config.test.js` y smoke tests reales de contenedores si Docker disponible.
- Modify only if proven necessary: dependencia local sin uso en `backend/package.json` y su lockfile, para build reproducible.

**Interfaces:** `HOST` opcional (default local 127.0.0.1, Docker 0.0.0.0); `COOKIE_SECURE` opcional con valor booleano explícito y default seguro en producción. Compose toma `docker/.env` ignorado usando `docker compose --env-file docker/.env ...`. Frontend usa `/api` y mocks desactivados. PostgreSQL 16 Alpine propuesto como versión fijada de despliegue nuevo.

- [x] Probar configuración RED: HOST configurable, Secure por defecto en producción y override explícito solo para HTTP local; rechazar valores booleanos ambiguos.
- [x] Implementar configuración y escucha sin cambiar valores locales por defecto; documentar HTTPS y cookies.
- [x] Crear Dockerfiles con contexto raíz para fixtures compartidas, npm ci y Node 22 Alpine; generar Prisma en Alpine y mantener Prisma CLI en etapa de migración.
- [x] Crear Nginx con proxy /api (sin eliminar prefijo), fallback React, límites de subida compatibles y resolución del servicio backend.
- [x] Crear Compose: BD saludable, paso migrate deploy, API saludable, frontend; volúmenes PostgreSQL/archivos, puertos y secretos suministrados externamente. No sembrar demos automáticamente.
- [x] Documentar preparación de configuración, build/up, db:seed para catálogos/admin, respaldo, restauración y diferencias entre BD nueva, SQL importado y BD existente; no proponer down -v como operación habitual.
- [ ] Ejecutar `docker compose --env-file docker/.env config --quiet` con valores temporales sin secretos; `docker compose ... build` y `up -d` si hay motor Docker. Expected: healthy; /api/health devuelve ok, /registro carga al abrir directamente, login conserva cookie y archivos/BD sobreviven recreación.
- [ ] Si Docker no está disponible, registrar esa limitación y no afirmar pruebas runtime. Ejecutar `npm run typecheck`, `npm run build`, `npm run format:check`, `npm run test:backend`, `npm run test:e2e`. Expected: todos los checks ejecutables sin fallos; informar bloqueos por separado.
- [ ] Revisar diff final y registrar evidencia antes de commit `feat: containerize frontend backend and database`.

## Cierre

- [x] Revisión independiente del conjunto según método de ejecución elegido; resolver hallazgos importantes con regresiones.
- [x] Entregar lista exacta de archivos, pruebas realmente ejecutadas y guía de BD/Docker.
- [x] No push, merge, publicación ni actualización de BD real automática.

## Estado

Diseño y plan aprobados. El usuario confirmó ambos tipos de RFC y trabajar en la
rama actual. Ejecución directa realizada; evidencia en el ledger de esta ejecución.

Implementación y revisión independiente realizadas. Backend 72/72; build,
TypeScript, formato y validación de Compose correctos. Flujos completos de correo
y roles 10/10 después de corregir también la carrera de consulta inicial de sesión.
La prueba móvil de carreras a 375 px falla igualmente sobre el commit original;
no se integra ni publica la rama con ese pendiente. Docker runtime queda por
comprobar en un equipo con Engine. Inventario y plan operativo en
`docs/cambios-registro-docker.md` y `docs/docker.md`.

Suite E2E final: 52/53 aprobadas. Único fallo:
`tests/e2e/careers.spec.js: career_actions_have_room_for_text_375`, reproducido en
el original. Pasos de commit/integración y pruebas de contenedores permanecen
pendientes; cambios preparados en la rama actual, sin commit, push ni merge.
