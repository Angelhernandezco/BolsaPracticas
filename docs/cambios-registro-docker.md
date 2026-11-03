# Entrega: registro, correo, SQL y Docker

## Resultado

- Teléfono opcional: exactamente 10 dígitos, sin espacios internos ni guiones.
- Matrícula: de 1 a 20 dígitos; se conserva como texto, incluidos ceros iniciales.
- RFC: persona moral de 12 caracteres y física de 13; mayúsculas, estructura,
  homoclave alfanumérica y fecha AAMMDD válida. No se verifica contra el SAT.
- Mismas reglas en registro y edición, UI y API; modo demo coherente.
- La primera apertura de verificación muestra éxito. La segunda muestra que ya
  estaba verificado. StrictMode comparte una operación durante esa visita;
  reintentos y cambios de token conservan su comportamiento.
- Dockerfiles, Nginx y Compose para frontend, API, PostgreSQL y migración inicial.
  BD y archivos tienen volúmenes persistentes; secretos externos a imágenes.

## Archivos y contenido

| Archivo | Cambio |
| --- | --- |
| `backend/src/lib/registration-validation.js` | Nuevo: reglas Zod de teléfono, matrícula y RFC con fecha real. |
| `backend/src/modules/auth/schemas.js` | Reutiliza reglas al registrar. |
| `backend/src/modules/profiles/service.js` | Reutiliza reglas al editar; teléfono admite vacío/null. |
| `frontend/src/lib/registration-validation.ts` | Nuevo: validadores y mensajes equivalentes para la UI. |
| `frontend/src/pages/AuthPages.tsx` | Valida registro, teclado numérico, límites de longitud y operación de verificación por visita. |
| `frontend/src/app/AuthContext.tsx` | Impide que una consulta de sesión antigua deshaga la verificación recién completada. |
| `frontend/src/pages/StudentPages.tsx` | Valida matrícula y teléfono antes de guardar el perfil. |
| `frontend/src/pages/CompanyPages.tsx` | Valida RFC físico/moral y teléfono al guardar. |
| `frontend/src/services/api.ts` | Normalización y reglas compartidas con el modo demo. |
| `backend/src/config.js` | HOST, COOKIE_SECURE y TRUST_PROXY explícitos y con valores seguros por defecto. |
| `backend/src/server.js` | Escucha en HOST configurable; contenedor usa 0.0.0.0. |
| `backend/src/app.js` | Aplica confianza limitada en el proxy configurado para separar límites por cliente. |
| `backend/.env.example` | Documenta HOST, TRUST_PROXY y COOKIE_SECURE sin cambiar secretos existentes. |
| `backend/package.json` | Elimina dependencia local sin uso `figma-make-app: file:..`. |
| `backend/package-lock.json` | Refleja esa eliminación; sin actualización de versiones del backend. |
| `backend/Dockerfile` | Nuevo: Node 22 Alpine, Prisma generado, etapa de migración y runtime sin herramientas de desarrollo. |
| `backend/Dockerfile.dockerignore` | Nuevo: contexto de backend limitado a código, paquetes, Prisma y manifiesto. |
| `frontend/Dockerfile` | Nuevo: build Node 22 Alpine y runtime Nginx Alpine, API relativa y mocks desactivados. |
| `frontend/Dockerfile.dockerignore` | Nuevo: excluye dependencias, builds y secretos del contexto frontend. |
| `frontend/nginx.conf` | Nuevo: proxy /api, rutas React, límite de subida y cabecera de IP reemplazada por la del cliente real de Nginx. |
| `compose.yaml` | Nuevo: PostgreSQL 17, migración/catálogos/admin, API y frontend con salud y volúmenes; driver local por defecto y S3 configurable mediante entorno. |
| `docker/.env.example` | Nuevo: configuración Docker de ejemplo sin credenciales reales, con parámetros opcionales para activar S3 después. |
| `fixtures/seed-data.json` | Matrículas demo numéricas, RFC E2E con bloque de letras y teléfonos sin espacios. |
| `backend/sql/bolsa_practicas.sql` | Regenerado desde Prisma y manifiesto con los datos demo corregidos. |
| `backend/tests/registration-validation.test.js` | Nuevo: formatos, ceros iniciales, opcionales y fechas inválidas/bisiestas. |
| `backend/tests/auth.test.js` | Prueba registro y perfiles por HTTP, incluidos ambos tipos de RFC y teléfono vacío/null. |
| `backend/tests/helpers.js` | Genera matrículas numéricas y RFC únicos con fecha válida para tests. |
| `backend/tests/seed-validation.test.js` | Nuevo: confirma que cuentas demo cumplen las reglas de edición. |
| `backend/tests/config.test.js` | Nuevo: HOST, cookies de producción y override HTTP local. |
| `backend/tests/proxy.test.js` | Nuevo: cuotas separadas por cliente detrás del proxy y confianza ilimitada rechazada. |
| `backend/tests/docker-runtime.test.js` | Nuevo: prueba optativa de importación real de la API dentro de la imagen, incluidos los adaptadores de almacenamiento. |
| `backend/tests/e2e-server.js` | Corrige solo los dos identificadores reservados antiguos dentro de la BD de pruebas. |
| `tests/e2e/registration-validation.spec.js` | Nuevo: validación visible de registro/perfiles y aceptación de RFC de 12/13 caracteres. |
| `tests/e2e/email-verification.spec.js` | Nuevo: reintento tras fallo de red, inválidos, vencidos y respuestas de tokens anteriores. |
| `tests/e2e/flows.spec.js` | Exige éxito exacto al verificar por primera vez y ya verificado al reabrir; RFC de empresa válido. |
| `tests/e2e/fixtures.js` | Generador de RFC para pruebas con fecha válida. |
| `tests/e2e/agreements.spec.js` | Usa RFC válidos al crear empresas. |
| `tests/e2e/layout.spec.js` | Usa RFC válidos al crear empresas para pruebas de presentación. |
| `tests/e2e/demo.spec.js` | Matrículas numéricas para altas demo. |
| `.gitignore` | Excluye respaldos privados en backups/. |
| `README.md` | Resumen de formatos y enlace a operación Docker/BD. |
| `backend/README.md` | Configuración de contenedores, validación y alcance del SQL. |
| `docs/docker.md` | Nuevo: instalación, actualización, respaldo, SQL CREATE frente a migraciones y diferencias con P10. |
| `docs/superpowers/specs/2026-11-02-registro-verificacion-docker-design.md` | Diseño aprobado. |
| `docs/superpowers/plans/2026-11-02-registro-verificacion-docker.md` | Plan aprobado y seguimiento. |
| `docs/cambios-registro-docker.md` | Este inventario y evidencia de entrega. |

## Verificación

- Backend: **72 pruebas aprobadas** tras la corrección encontrada en revisión.
- TypeScript, compilación frontend y formato: comprobados sin errores.
- Compose v2.40.3: configuración validada usando ejecutable oficial con checksum
  verificado, sin instalar un daemon ni modificar la configuración del equipo.
- Pruebas de navegador enfocadas: verifican registro, ambos RFC, perfiles,
  primera verificación, reutilización, reintento y cambio de token.
- Última revisión completa: **53/53 pruebas E2E aprobadas**. El caso móvil de
  carreras a 375 px que falló anteriormente pasó en esta ejecución; no se cambió
  ese diseño ni se considera demostrada la eliminación de una posible intermitencia.
- Suite backend actual: 72 aprobadas, 0 fallidas y 1 prueba Docker omitida por
  defecto; esa prueba Docker se ejecutó por separado y pasó. TypeScript, build y
  formato correctos. Verificación de escritura/lectura local dentro del backend
  Docker correcta, con archivo temporal aleatorio eliminado al terminar.
- El caso de carrera entre consultar la sesión inicial y verificar correo falló
  primero y pasó tras añadir el control de versión de sesión en AuthContext.
- Las pruebas de regresión de formatos se comprobaron también desactivando
  temporalmente el helper: fallaron por aceptar entradas inválidas y el helper se
  restauró automáticamente antes de la comprobación final.
- Revisión independiente: detectó la cuota compartida detrás de Nginx; corregida
  y protegida por dos pruebas que se observaron fallar y después pasar.

Verificación posterior con Docker Desktop instalado: imágenes construidas y
servicios PostgreSQL, API y frontend saludables; migraciones terminadas con código
0. Se comprobó HTTP 200 en `/api/health` directo y a través de Nginx, y en
`/registro`. La prueba de importación en la imagen falló primero por una exclusión
demasiado amplia de `storage` y pasó al limitarla a `backend/storage`; el código
de `backend/src/services/storage` queda incluido. También se corrigió únicamente
el host de DATABASE_URL en `docker/.env`: de localhost a db, conservando las
credenciales. Los volúmenes se conservaron durante la corrección y el segundo
arranque confirmó que no había migraciones pendientes. La comprobación completa
de archivos subidos y entrega SMTP real sigue siendo un paso de aceptación manual.

Observación previa: `career_actions_have_room_for_text_375` detectó un botón de
carreras parcialmente fuera del viewport móvil. Se reprodujo igual con una copia
del commit original `1e81c7f`, antes de estos cambios. No se modificó ese diseño.
La primera suite tuvo dos fallos adicionales por identificadores E2E antiguos;
ambos pasaron al corregir exclusivamente las cuentas reservadas de prueba. Una
ejecución posterior detectó la carrera de sesión, que se reprodujo y corrigió.
Una ejecución anterior conservaba solo el fallo móvil; la última revisión completa
pasó los 53 casos. La revisión independiente actual no encontró nuevos defectos
Critical/Important. SMTP/S3 reales y persistencia de archivos tras recreación
completa requieren su comprobación específica.

## Decisiones y límites

- PostgreSQL 17 mantiene la versión mayor de la instalación actual; no reutilizar
  un volumen de otra versión mayor sin un procedimiento de actualización.
- Se separa Prisma CLI del runtime; se conserva en la imagen de migración.
- Se mantienen DATABASE_URL y sesiones de ocho horas. No se añaden variables
  DB_* ni JWT_EXPIRES_IN solo porque aparecen en el informe.
- El SQL CREATE es para una instalación demo nueva y vacía. Las validaciones no
  requieren cambiar columnas: no se añadió una migración artificial.
- No se ejecutaron cambios sobre la BD de aplicación ni se corrigieron sus
  registros históricos. Las pruebas usan exclusivamente la BD `_test`.
- Se normalizaron finales de línea del checkout para comprobar Prettier en Windows;
  esto no añade diferencias de contenido en los archivos ajenos a esta entrega.
- La publicación en ECR y el despliegue en AWS quedan para un paso posterior.

## Plan de acción para la BD y el despliegue

1. Revisar la configuración destino y respaldar la BD existente y archivos.
2. Para una instalación Docker nueva, completar `docker/.env` y levantar Compose;
   el arranque aplica migraciones y siembra catálogos/administrador, sin demos.
3. Para una BD existente, revisar historial de Prisma y aplicar solo migraciones
   pendientes. No importar `bolsa_practicas.sql` sobre ella.
4. En un equipo con Docker, construir y arrancar, probar login y verificación con
   SMTP configurado y comprobar que BD/archivos sobreviven a recrear contenedores.
5. Vigilar el caso móvil que había fallado, aunque la revisión actual pasó completa.
   La decisión de integrar/publicar la rama queda pendiente del usuario.
