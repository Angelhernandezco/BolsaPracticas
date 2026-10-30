# Backend de Bolsa Prácticas

Express en JavaScript ESM, Prisma 6.19 y PostgreSQL. El frontend React/TypeScript de Figma conserva sus rutas y flujos. Node 22.16 o superior de la serie 22.

## Arranque local

Desde la raíz:

```powershell
npm install
npm --prefix backend install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Completa `backend/.env` antes de continuar. **En la entrega local ya está configurado; no lo sobrescribas con el ejemplo.** Contiene la conexión PostgreSQL y Gmail proporcionadas, un JWT_SECRET aleatorio y la contraseña privada del administrador. Ningún secreto pertenece a Git ni a variables VITE_.

```powershell
npm --prefix backend run db:generate
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
npm run dev:backend
```

En otra terminal: `npm run dev`, solo si el servidor de Vite no está ya funcionando. Frontend: http://localhost:8443. API: http://localhost:3001/api/health. El proxy `/api` mantiene cookies y archivos en el mismo origen. `BACKEND_URL` cambia el destino del proxy; `FRONTEND_URL` determina el enlace de correo y el origen permitido. Para otro origen exacto usa `ALLOWED_ORIGINS` separado por comas. El servidor escucha localmente; para desplegar usa un reverse proxy en el mismo host y TLS.

## Base de datos y SQL

- `prisma/schema.prisma`: modelo; `prisma/migrations`: historial reproducible.
- `sql/bolsa_practicas.sql`: CREATE TABLE e índices del esquema final, para **base nueva vacía**, no para ejecutarlo encima de tablas existentes. Incluye únicamente hashes y contraseñas públicas de demostración; nunca las credenciales privadas. No contiene DROP TABLE.
- `db:inspect`: lista tablas sin volcar información personal.
- Las migraciones de carreras y convenios conservan los datos. El booleano anterior de convenio se elimina: los periodos quedan sin fechas hasta que el administrador los capture; no se inventan periodos históricos.
- En una base vacía usa `db:migrate` y `db:seed`. Si importaste el SQL final en una base nueva, marca las cuatro migraciones existentes con `prisma migrate resolve --applied <nombre>` antes de usar `db:migrate`; no vuelvas a crear esas tablas. Comprueba que el esquema coincida antes de reconocer migraciones.
- Las migraciones conservan las columnas de claves antiguas como legado. Datos o archivos previos no se inventan ni convierten automáticamente; una instalación con datos requiere revisar su contenido antes de migrar.
- Matrícula, RFC, correo, perfil por usuario y postulación por estudiante/convocatoria son únicos. Carreras/roles se siembran idempotentemente. Los nombres internos Prisma están mapeados a tablas y columnas en español.

## Cuentas y permisos

`db:seed` crea el administrador indicado por `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres), si aún no existe. No sobrescribe contraseñas. No hay registro público de administrador.

El estudiante acepta exactamente `@uas.edu` o `@uas.edu.mx`. Universidad fija UAS. Empresas verifican correo y esperan resolución administrativa. El convenio es independiente de la aprobación y solo lo modifica el administrador. El administrador no tiene acceso a CV ni a candidatos.

Para conservar funcionales los botones de demostración existentes en Figma, hay datos de desarrollo opcionales:

```powershell
# Solo con ALLOW_DEMO_SEED=true y NODE_ENV distinto de production:
npm --prefix backend run db:seed:demo
```

Crea las cuentas que muestra la pantalla de acceso, con la contraseña de demostración visible allí, un CV de ejemplo y convocatorias abierta/cerrada/borrador. No envía correos. Si ya existe cualquiera de los correos reservados, omite la semilla completa sin modificar perfiles, CV ni relaciones; repetirla conserva lo existente. **No habilites esta semilla en producción**; las cuentas verificadas son datos de demostración explícitos. El administrador privado de `.env` es independiente del administrador demo.

## Carreras y convenios

Solo el administrador crea, renombra, desactiva o reactiva carreras. Los nombres son únicos incluso entre carreras inactivas, ignorando espacios exteriores y mayúsculas. El ID permanece estable y las asociaciones existentes se conservan; las inactivas dejan de ofrecerse en nuevas selecciones. Las semillas usan claves estables y nunca restauran nombres o estados editados.

El periodo de convenio es opcional: ambas fechas vacías, o ambas completas con fin igual o posterior al inicio. Son columnas DATE sin hora. El estado no se almacena: el navegador calcula «Sin convenio», «Próximo a iniciar», «Activo» o «Vencido» según su fecha local, incluyendo todo el último día y actualizándose al cambiar de día o recuperar el foco. Cada fecha y el estado tienen su columna en empresas.

## SQL y semillas compartidas

`fixtures/seed-data.json` es el único manifiesto de los escenarios fijos: roles, carreras, cuentas demo/E2E, empresas con los cuatro estados de convenio, convocatorias, postulaciones y metadatos de CV. El modo mock lo consume sin habilitarse en la API real. No incluye los registros aleatorios de pruebas anteriores, usuarios privados, sesiones o tokens. Las pruebas crean sus datos variables únicamente en la base `_test`.

```powershell
# Desde la raíz. Referencia predeterminada reproducible: 2026-10-29.
$env:SEED_REFERENCE_DATE="2026-10-29"
npm --prefix backend run db:sql:generate
# Importa backend/sql/bolsa_practicas.sql SOLO en una base nueva y vacía.
# Después de importar, prepara los bytes del PDF en el almacenamiento local:
npm --prefix backend run db:seed:assets
```

El SQL contiene fechas explícitas calculadas desde esa referencia. Cambiar `SEED_REFERENCE_DATE` y regenerarlo actualiza los escenarios relativos. `db:seed:demo` utiliza la misma referencia y el mismo manifiesto. El SQL por sí solo no restaura bytes: `db:seed:assets` copia el PDF de `frontend/public/demo-cv.pdf` únicamente a las claves demo de sus propietarios declarados, con escritura exclusiva, sin sobrescribir archivos. Los metadatos conservan driver local aunque las nuevas subidas se configuren para S3. No ejecutes la semilla demo en producción.

## Correo y sesiones

SMTP Gmail con contraseña de aplicación en `EMAIL_PASSWORD`; admite espacios de agrupación. `mail:check` comprueba conexión/autenticación sin enviar correos. Un registro real envía el enlace al destinatario registrado. Si falla, conserva la cuenta pendiente y permite reenviar; la UI informa el fallo. Las pruebas automáticas capturan mensajes, no envían a destinatarios ficticios.

Al aprobar una empresa se guarda atómicamente una notificación y una copia de sus fechas. El envío posterior utiliza el correo de la cuenta, el enlace de acceso y la fecha de referencia de America/Mazatlan. Un fallo SMTP conserva la aprobación y queda visible en el detalle administrativo con reintento. Cambiar fechas o rechazar una solicitud no envía este correo. La reclamación atómica y su plazo de 60 segundos evitan envíos simultáneos y permiten recuperar un proceso interrumpido. Si SMTP acepta el mensaje y el proceso cae antes de guardar el resultado, un reintento puede duplicarlo; no se garantiza entrega exactamente una vez. No hay un trabajador automático: el administrador reintenta los pendientes/fallidos desde el detalle.

Tokens aleatorios: se guarda SHA-256, vencen a las 24 horas, uso único y reenvío después de 60 segundos. El nuevo enlace invalida los anteriores pendientes. Abrir un enlace ajeno no cambia la identidad de la sesión. La verificación usa POST `/api/auth/email/verify` y la pantalla conserva `/verificar-email?token=...`.

JWT de 8 horas en cookie HttpOnly, SameSite=Lax, Secure en producción, asociado a sesión revocable. Logout invalida también el token copiado. El servidor consulta rol, estado y aprobación vigentes. Origin/CORS se limita a orígenes configurados. Un 401 protegido activa el flujo de sesión vencida; 403 no cierra la sesión.

## Archivos locales y S3

Por defecto `STORAGE_DRIVER=local`, archivos opacos en `backend/storage/`, nunca en public. Respalda tanto PostgreSQL como ese directorio. CV: PDF hasta 5.000.000 bytes; fotos/logos: JPG/PNG hasta 2.000.000 bytes, comprobando firma del contenido. No se aceptan URLs de archivo arbitrarias desde el cliente.

El estudiante accede a su CV; la empresa aprobada solo al CV exacto asociado a una postulación recibida. Cambiar CV no reemplaza la copia enviada. Las rutas `/api/files/:id` autorizan cada lectura, admiten Range para PDF y no exponen claves o rutas físicas.

Para nuevas subidas a S3:

```dotenv
STORAGE_DRIVER=s3
AWS_REGION=us-west-2
S3_BUCKET=your-private-bucket
```

Configura credenciales por la cadena estándar del SDK (por ejemplo AWS_PROFILE en desarrollo o un rol IAM en AWS). Habilita bloqueo de acceso público en el bucket. Permisos del rol limitados al prefijo/bucket usado: s3:PutObject, s3:GetObject y s3:DeleteObject. El adaptador no establece ACL pública; la API sigue autorizando y transmitiendo el archivo. Las claves AWS nunca pasan al frontend.

Cada archivo guarda su driver; los anteriores locales siguen funcionando al cambiar el predeterminado, siempre que su directorio se conserve. **Cambiar la variable no copia archivos históricos a S3**. Esa migración física es un procedimiento separado. S3 se prueba con un cliente simulado; la integración real requiere configurar un bucket.

## Convocatorias

Fecha límite DATE, sin hora: recibe postulaciones durante todo el día en America/Mazatlan. El servidor calcula el estado efectivo; no depende de tareas programadas ni del reloj del navegador. La fecha de cierre manual se conserva aparte. Borradores requieren título; publicación exige campos completos. Una cerrada/vencida conserva historial y CV. Cupos son plazas anunciadas; no se descuentan al postular ni al aceptar. Las carreras son orientativas.

## Pruebas

```powershell
npm --prefix backend run test:prepare
npm run test:backend
npx playwright install chromium
npm run test:e2e
npm run typecheck
npm run build
```

`test:prepare` utiliza `TEST_DATABASE_URL` o deriva una BD con sufijo `_test`; rechaza la base de aplicación, crea la de pruebas si no existe, aplica migraciones y escribe `.env.test` ignorado. Requiere privilegio de crear BD la primera vez; también puedes crearla por separado y proporcionar la URL. No usa reset ni limpia bases existentes.

Playwright levanta su propio backend en 3002 y Vite en 8444 contra esa base de pruebas, con correo capturado en `storage-test/e2e-outbox.jsonl`. Ese servidor y sus utilidades viven solo en tests; la API normal no expone tokens ni herramientas de prueba. Las pruebas agregan registros identificables a la BD de pruebas. No ejecutes sus utilidades con una BD real.

Se cubren autorización, sesiones, correo, concurrencia, perfiles, CV inmutable, fechas de Mazatlán y flujos completos de los tres roles. Capturas responsive en `test-results/` (ignorado). Nunca afirmar comprobación de entrega de correo o S3 real a partir de un transporte simulado.

## Producción y límites de esta entrega

No incluye desplegar AWS ni configurar bucket, DNS o TLS. Configura `NODE_ENV=production`, HTTPS en el proxy y FRONTEND_URL correcto; usa secretos privados y elimina datos demo. Opcionalmente `SERVE_FRONTEND=true` sirve `frontend/dist` con Express después de `npm run build`, manteniendo `/api` reservado.

Los cambios de Figma que estaban sin commit se conservaron; los archivos de frontend quedan disponibles como cambios locales para revisar junto con esa versión. No se incorporan automáticamente a commits de backend ni se hace push/merge.
