# Bolsa Prácticas UAS

El frontend de Figma está en `frontend/` (React y TypeScript). La API está en `backend/` (Express por módulos, JavaScript, Prisma y JWT). Las semillas compartidas están en `fixtures/seed-data.json`.

Desde la raíz:

```powershell
npm install
npm --prefix backend install
npm --prefix backend run db:generate
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
npm run dev:backend
# Otra terminal, si no está iniciado:
npm run dev
```

Frontend: http://localhost:8443. API: http://localhost:3001/api/health. La configuración local existente se conserva en `backend/.env` y `frontend/.env.local`; no la reemplaces con los ejemplos. En una instalación nueva copia los `.env.example` de ambas carpetas y completa sus valores.

```powershell
npm run typecheck
npm run build
npm run test:backend
npm run test:e2e
```

El build queda en `frontend/dist`. Express puede servirlo con `SERVE_FRONTEND=true`. Las pruebas usan una base con sufijo `_test`, backend 3002 y frontend 8444, y capturan los correos. Consulta [backend/README.md](backend/README.md) para preparar la base de pruebas, almacenamiento local/S3, SQL y semillas.

El administrador gestiona carreras y periodos opcionales de convenio. Desactivar una carrera conserva las asociaciones existentes. Los convenios se muestran según la fecha local del navegador; el correo utiliza America/Mazatlan y las fechas guardadas al aprobar. Las fechas límite de convocatorias conservan su regla de America/Mazatlan.

## Formato con Prettier

Backend y frontend comparten la configuración `.prettierrc` de la raíz: sin punto y coma, comillas simples, dos espacios, ancho de 80 y comas finales. Los archivos generados, dependencias, almacenamiento, secretos, documentación y lockfiles se excluyen mediante `.prettierignore`.

```powershell
# Todo el código del proyecto:
npm run format
npm run format:check
# Por paquete:
npm --prefix frontend run format
npm --prefix frontend run format:check
npm --prefix backend run format
npm --prefix backend run format:check
```

VS Code recomienda la extensión Prettier y configura el formato al guardar. En otros editores selecciona Prettier como formateador. `format:check` comprueba el formato sin modificar archivos.
