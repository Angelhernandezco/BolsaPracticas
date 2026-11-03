# Docker y actualización de la base de datos

## Qué incluye

Los Dockerfiles siguen la práctica P10: Node 22 Alpine y npm ci; frontend
multietapa servido con Nginx Alpine, puertos 8080 y 3000 y credenciales fuera de
las imágenes. El backend también separa dependencias de ejecución de herramientas.

`compose.yaml` coordina tres servicios permanentes y una tarea de inicialización:

1. `db`: PostgreSQL 17 Alpine, sin publicar el puerto de BD al host.
2. `migrate`: espera a la BD saludable, ejecuta `prisma migrate deploy` y siembra
   catálogos y el administrador configurado. Termina con código 0; si falla, la
   API no arranca. No siembra cuentas demo ni sobrescribe cuentas existentes.
3. `backend`: API con dependencias de producción, cliente Prisma generado en
   Alpine, usuario `node` y almacenamiento privado persistente.
4. `frontend`: Nginx sirve React y reenvía `/api` a `backend:3000`.

Las condiciones de arranque usan los mecanismos oficiales de
[Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).

El runtime de API no contiene Prisma CLI; las operaciones administrativas usan la
imagen `migration`. Generar el cliente no conecta a la BD. Las migraciones se
aplican al ejecutar contenedores, nunca durante `docker build`.

Los builds usan **la raíz del repositorio como contexto**. El frontend importa
`fixtures/seed-data.json` fuera de su carpeta. Los archivos
`backend/Dockerfile.dockerignore` y `frontend/Dockerfile.dockerignore` son las
exclusiones específicas que Docker aplica a cada Dockerfile con este contexto;
no son `.dockerignore` inefectivos dentro de subcarpetas. Excluyen `.env`,
dependencias locales, pruebas, datos privados y resultados de compilación.

## Primera instalación con una BD nueva en Docker

Requisitos: Docker Engine o Docker Desktop en modo contenedores Linux y Docker
Compose v2. Ejecutar desde la raíz del repositorio:

```powershell
Copy-Item docker/.env.example docker/.env
```

Editar `docker/.env` antes del arranque:

- `POSTGRES_PASSWORD`: contraseña privada. Usar una cadena hexadecimal facilita
  utilizarla sin escapes en `DATABASE_URL`.
- `DATABASE_URL`: debe usar esa misma contraseña, usuario y nombre de BD;
  el host es `db` y el puerto interno 5432. Si la contraseña contiene caracteres
  reservados, codificar el componente de contraseña para una URL.
- `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD`: administrador privado; contraseña de 12
  caracteres como mínimo. Se crea si no existe, sin actualizar la contraseña de
  una cuenta existente.
- `EMAIL_USER` y `EMAIL_PASSWORD`: credenciales SMTP para enviar verificaciones.
  Si faltan o falla SMTP, la cuenta queda pendiente y la UI permite reenviar.

Se puede generar cada secreto con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
El archivo de ejemplo no contiene secretos utilizables. `docker/.env` está
ignorado por Git. No sobrescribir `backend/.env` ni `frontend/.env.local`.

```powershell
docker compose --env-file docker/.env config --quiet
docker compose --env-file docker/.env up --build -d
docker compose --env-file docker/.env ps -a
docker compose --env-file docker/.env logs migrate
curl.exe http://localhost:3000/api/health
curl.exe http://localhost:8080/api/health
curl.exe -I http://localhost:8080/registro
```

Abrir http://localhost:8080. La API de salud responde `{"status":"ok"}`.
`migrate` debe aparecer como `Exited (0)` y los servicios permanentes saludables.
Nginx tiene fallback para abrir `/registro` y otras rutas React directamente,
proxy de `/api` y un límite de subida de 6 MiB (compatible con el CV de 5 MB).

El puerto directo de API se publica solo en 127.0.0.1. El navegador usa `/api`
desde el mismo origen del frontend. Cambiar `FRONTEND_PORT` requiere actualizar
también `FRONTEND_URL`, que determina enlaces de correo y el origen permitido.
`BACKEND_PORT` cambia el puerto del host; el puerto entre contenedores sigue en
3000. No se habilitan mocks en el build de Docker.

Compose establece `TRUST_PROXY=1` para el único salto de Nginx. Nginx reemplaza
`X-Forwarded-For` con la IP de su conexión; no acepta la lista enviada por el
cliente. Así el límite de autenticación se aplica por cliente. Mantener el
puerto directo de API restringido a localhost; no publicarlo en Internet con
esta configuración. Fuera de Docker la confianza en proxies está desactivada.
Si se añade otro proxy delante de Nginx, revisar la cadena y las IP permitidas
antes de configurar la IP real; no habilitar confianza ilimitada en cabeceras.

## Almacenamiento local ahora y S3 después

`STORAGE_DRIVER=local` conserva fotos, logos y CV en el volumen `uploaded_files`.
Se puede mantener esta configuración sin disponer de recursos AWS.

Para futuras subidas a S3, configurar en `docker/.env`:

```dotenv
STORAGE_DRIVER=s3
AWS_REGION=us-west-2
S3_BUCKET=nombre-del-bucket-privado
```

El backend también necesita permisos AWS para leer, subir y borrar objetos del
bucket: en AWS usar el rol IAM del servicio; desde Docker local se pueden
proporcionar credenciales mediante `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
y `AWS_SESSION_TOKEN` cuando corresponda. No incluirlas en las imágenes ni Git.

Después de cambiar las variables, recrear el backend para que las reciba:

```powershell
docker compose --env-file docker/.env up -d --no-deps --force-recreate backend
```

No se requiere reconstruir las imágenes. El cambio afecta a todas las nuevas
subidas, incluidos CV. Los archivos anteriores conservan su driver local y siguen
necesitando el volumen; cambiar variables no los copia a S3. S3 es un servicio
independiente de EC2: no requiere disponer de una instancia EC2.

## HTTP local y HTTPS de producción

La imagen corre con `NODE_ENV=production`. Por defecto la aplicación usa cookies
Secure en producción. El ejemplo establece explícitamente `COOKIE_SECURE=false`
para trabajar con `http://localhost:8080`. Con HTTPS configurar
`COOKIE_SECURE=true` y el `FRONTEND_URL=https://...` exacto. No usar el ajuste de
HTTP local en una instalación pública. Mantener el volumen de archivos privados.

El frontend contiene archivos compilados: sus variables `VITE_*` se establecen al
construir y no se modifican al iniciar Nginx. La API se configura en ejecución.

## Diferencias con el informe P10

- La API existente ofrece `/api/health`, no un endpoint de comprobación en `/`.
- Prisma usa `DATABASE_URL`; `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y
  `DB_PASSWORD` del informe no son variables de la API. `POSTGRES_*` configura
  el contenedor PostgreSQL y debe coincidir con la URL.
- `JWT_EXPIRES_IN` no está implementada. JWT, sesión y cookie conservan ocho horas.
- `HOST=0.0.0.0` permite conexiones desde Nginx; en desarrollo fuera de Docker
  el valor por defecto sigue siendo 127.0.0.1.
- Se retiró la dependencia local sin uso `figma-make-app: file:..` del backend,
  que enlazaba al paquete raíz y su instalación de frontend.
- Publicar imágenes en ECR es un procedimiento posterior; esta entrega no realiza
  autenticación, push ni cambios en AWS.

## Qué es el archivo “create”

`backend/sql/bolsa_practicas.sql` ya existía. Es el **script de instalación
completa**: contiene `CREATE TABLE`, índices, claves foráneas, restricciones e
INSERT de datos públicos demo. Se genera desde Prisma y el manifiesto
`fixtures/seed-data.json`; no se mantiene otro esquema paralelo a mano.

En esta actualización se corrigieron matrículas, RFC y teléfonos demo que no
cumplían las reglas nuevas y se regeneró el SQL. Las columnas existentes ya
admiten los formatos; **no hay cambio de esquema ni una nueva migración** por
esta validación. No se normalizan automáticamente datos históricos.

```powershell
npm --prefix backend run db:sql:generate
```

El SQL solo se importa en una BD **nueva y vacía**. Contiene contraseñas públicas
demo y no es una instalación de producción. Docker usa las migraciones y la
semilla de catálogos/administrador, no importa este archivo automáticamente.

Si se eligió importar el SQL en una BD nueva, comprobar el esquema y reconocer
las cuatro migraciones antes de ejecutar `migrate deploy`:

```powershell
node --env-file=backend/.env backend/node_modules/prisma/build/index.js migrate resolve --schema backend/prisma/schema.prisma --applied 202610290001_baseline
node --env-file=backend/.env backend/node_modules/prisma/build/index.js migrate resolve --schema backend/prisma/schema.prisma --applied 202610290002_integration
node --env-file=backend/.env backend/node_modules/prisma/build/index.js migrate resolve --schema backend/prisma/schema.prisma --applied 202610290003_careers
node --env-file=backend/.env backend/node_modules/prisma/build/index.js migrate resolve --schema backend/prisma/schema.prisma --applied 202610290004_agreements_notifications
```

Esos comandos se ejecutan desde la raíz y cargan la configuración local del
backend; comprobar el destino antes de ejecutarlos. Como alternativa en Docker usar `docker compose
--env-file docker/.env run --rm --no-deps migrate ./node_modules/.bin/prisma
migrate resolve --applied <nombre>`. `resolve` no crea tablas; solo registra una
migración cuyo esquema ya se comprobó. Los metadatos demo de CV necesitan los
bytes del PDF, mediante `db:seed:assets` en una instalación local de demostración.

## Actualizar una BD existente conservando datos

1. Identificar servidor, nombre de BD y versión de PostgreSQL; hacer respaldo de
   BD y archivos. No apuntar a una BD real para ejecutar pruebas.
2. Revisar estado del historial de Prisma. Una BD importada manualmente requiere
   comprobar y reconocer su esquema antes de migrar; no ejecutar CREATE encima.
3. Con la configuración local del backend correcta, usar
   `npm --prefix backend run db:migrate`. Aplica solo migraciones pendientes.
4. Desplegar el código nuevo. Los datos históricos siguen existiendo; si un
   teléfono o identificador antiguo es inválido, el usuario debe corregirlo para
   guardar ese perfil. No inventar RFC ni matrículas para convertir registros.

Para actualizar una instalación que ya usa estos contenedores, después del
respaldo:

```powershell
docker compose --env-file docker/.env build
docker compose --env-file docker/.env stop frontend backend
docker compose --env-file docker/.env run --rm --no-deps migrate
docker compose --env-file docker/.env up -d --force-recreate migrate backend frontend
```

Detener el procedimiento si falla la migración. La ejecución de `up` vuelve a
comprobarla antes de habilitar API/frontend; las migraciones y semillas de
catálogos/administrador son idempotentes. Para conectar una BD externa existente,
adaptar explícitamente el servicio `db` y sus dependencias: cambiar solo la URL
no convierte el Compose de instalación nueva en un despliegue externo revisado.

## Respaldos y persistencia

`postgres_data` conserva la BD y `uploaded_files` conserva CV, fotos y logos.
`docker compose ... down` conserva ambos volúmenes. `down -v` los elimina y no es
un comando de actualización.

Ejemplo con usuario/BD predeterminados del ejemplo, desde PowerShell:

```powershell
New-Item -ItemType Directory -Force backups
docker compose --env-file docker/.env exec -T db pg_dump -U bolsa -d bolsa_practicas -Fc -f /tmp/bolsa.dump
docker compose --env-file docker/.env cp db:/tmp/bolsa.dump backups/bolsa.dump
docker compose --env-file docker/.env exec -T backend tar -czf /tmp/storage.tar.gz -C /app/backend/storage .
docker compose --env-file docker/.env cp backend:/tmp/storage.tar.gz backups/storage.tar.gz
```

Crear nombres fechados para no sobrescribir el respaldo anterior y guardar una
copia fuera del equipo. En PowerShell antiguo no redirigir un dump binario con
`>`; `pg_dump -f` y `compose cp` conservan los bytes. Para un respaldo consistente
congelar escrituras de la aplicación durante la captura de BD y archivos.

Restaurar a una BD nueva y vacía usando `pg_restore --exit-on-error --no-owner
--no-privileges`, con herramientas compatibles con la versión que creó el dump,
antes de levantar la API. Recuperar también los archivos con sus claves originales;
restaurar solo tablas no recupera CV ni imágenes. Revisar el destino antes de
restaurar o reconocer migraciones.

## Pruebas

Prueba opcional de la imagen del backend, después de construirla:

```powershell
$env:RUN_DOCKER_TESTS="true"
node --test backend/tests/docker-runtime.test.js
Remove-Item Env:RUN_DOCKER_TESTS
```

Comprueba que la imagen puede importar la API y sus adaptadores de almacenamiento
sin conectarse a una BD. Por defecto esta prueba se omite en la suite de Node.
`DOCKER_BIN` permite indicar la ruta de docker.exe si no está en PATH.

Si `migrate` termina con P1001 apuntando a `localhost:5432`, comprobar el host de
DATABASE_URL en `docker/.env`: entre contenedores es `db`, no localhost. Corregir
la URL y repetir `docker compose --env-file docker/.env up -d`; no eliminar los
volúmenes para resolver un error de conexión. Si cambiaste las credenciales después
de inicializar PostgreSQL, revisar por separado las credenciales del volumen.

```powershell
npm --prefix backend run test:prepare
npm run typecheck
npm run build
npm run test:backend
npx playwright install chromium
npm run test:e2e
npm run format:check
```

En PowerShell con restricción de scripts usar `npm.cmd` y `npx.cmd`. La BD de
pruebas tiene sufijo `_test` y los correos de tests se capturan, no se envían.
La comprobación de Compose no reemplaza construir y ejecutar las imágenes: para
la aceptación de Docker comprobar además login, envío de verificación con SMTP
configurado y conservación de una cuenta/archivo después de recrear contenedores.
