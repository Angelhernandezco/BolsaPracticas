import { Prisma } from "@prisma/client"
import { spawnSync } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import {
  loadSeedData,
  seedRecords,
  resolveSeedData,
} from "../prisma/seed-data.js"

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "boolean" || typeof value === "number")
    return String(value)
  return `'${(value instanceof Date ? value.toISOString() : String(value)).replaceAll("'", "''")}'`
}

export function renderSeedSql(manifest, options = {}) {
  const ids = new Map(),
    counters = new Map(),
    statements = []
  for (const record of seedRecords(manifest, options)) {
    const model = Prisma.dmmf.datamodel.models.find(
      (item) => item.name === record.model,
    )
    const data = resolveSeedData(record.data, ids)
    const idField = model.fields.find((field) => field.isId)
    if (idField && data[idField.name] === undefined) {
      const next = (counters.get(record.model) || 0) + 1
      counters.set(record.model, next)
      data[idField.name] = next
    }
    ids.set(record.key, data.id)
    const columns = Object.keys(data).map(
      (name) =>
        `"${model.fields.find((field) => field.name === name).dbName || name}"`,
    )
    statements.push(
      `INSERT INTO "${model.dbName}" (${columns.join(", ")}) VALUES (${Object.values(data).map(sqlValue).join(", ")});`,
    )
  }
  for (const model of Prisma.dmmf.datamodel.models) {
    const field = model.fields.find(
      (item) => item.isId && item.default?.name === "autoincrement",
    )
    if (field)
      statements.push(
        `SELECT setval(pg_get_serial_sequence('"${model.dbName}"', '${field.dbName}'), COALESCE((SELECT MAX("${field.dbName}") FROM "${model.dbName}"),1), EXISTS(SELECT 1 FROM "${model.dbName}"));`,
      )
  }
  return statements.join("\n")
}

export async function renderInstallSql(
  manifest = loadSeedData(),
  { referenceDate = manifest.referenceDate } = {},
) {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/prisma/build/index.js", import.meta.url),
      ),
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url)),
      "--script",
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0) throw new Error(result.stderr)
  const checks = `
CREATE UNIQUE INDEX carrera_nombre_normalizado_key ON carrera(lower(btrim(nombre)));
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_estado CHECK (estado IN ('BORRADOR','ABIERTA','CERRADA'));
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_cupos CHECK ((estado='BORRADOR' AND cupos>=0) OR cupos>0);
ALTER TABLE postulacion ADD CONSTRAINT ck_postulacion_estado CHECK (estado IN ('ENVIADA','EN_REVISION','ACEPTADA','RECHAZADA'));
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_aprobacion CHECK (estado_aprobacion IN ('pending','approved','rejected'));
ALTER TABLE archivo ADD CONSTRAINT ck_archivo_driver CHECK (driver IN ('local','s3'));
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_fechas_convenio CHECK ((fecha_inicio_convenio IS NULL AND fecha_fin_convenio IS NULL) OR (fecha_inicio_convenio IS NOT NULL AND fecha_fin_convenio IS NOT NULL AND fecha_fin_convenio>=fecha_inicio_convenio));
ALTER TABLE notificacion_aprobacion ADD CONSTRAINT ck_notificacion_estado CHECK (estado IN ('pending','sending','sent','failed'));
ALTER TABLE notificacion_aprobacion ADD CONSTRAINT ck_notificacion_fechas CHECK ((fecha_inicio_convenio IS NULL AND fecha_fin_convenio IS NULL) OR (fecha_inicio_convenio IS NOT NULL AND fecha_fin_convenio IS NOT NULL AND fecha_fin_convenio>=fecha_inicio_convenio));`
  return `-- Instalación para BASE NUEVA. No ejecutar sobre una base existente.\n-- Datos públicos de demostración; referencia: ${referenceDate}. Sin sesiones ni tokens.\n-- El PDF requiere npm run db:seed:assets. No contiene credenciales privadas.\nBEGIN;\n${result.stdout}\n${checks}\n\n-- INICIO SEMILLAS DEMO (contraseñas públicas: Demo1234 / E2E TestPassword123!)\n${renderSeedSql(manifest, { referenceDate })}\nCOMMIT;\n`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const manifest = loadSeedData()
  await writeFile(
    new URL("../sql/bolsa_practicas.sql", import.meta.url),
    await renderInstallSql(manifest, {
      referenceDate: process.env.SEED_REFERENCE_DATE || manifest.referenceDate,
    }),
  )
  console.log(
    "SQL de instalación generado desde Prisma y el manifiesto público.",
  )
}
