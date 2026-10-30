-- DropForeignKey
ALTER TABLE "convocatoria" DROP CONSTRAINT "fk_convocatoria_empresa";

-- DropForeignKey
ALTER TABLE "convocatoria_carrera" DROP CONSTRAINT "fk_convcar_carrera";

-- DropForeignKey
ALTER TABLE "convocatoria_carrera" DROP CONSTRAINT "fk_convcar_convocatoria";

-- DropForeignKey
ALTER TABLE "empresa" DROP CONSTRAINT "fk_empresa_usuario";

-- DropForeignKey
ALTER TABLE "estudiante" DROP CONSTRAINT "fk_estudiante_carrera";

-- DropForeignKey
ALTER TABLE "estudiante" DROP CONSTRAINT "fk_estudiante_usuario";

-- DropForeignKey
ALTER TABLE "postulacion" DROP CONSTRAINT "fk_postulacion_convocatoria";

-- DropForeignKey
ALTER TABLE "postulacion" DROP CONSTRAINT "fk_postulacion_estudiante";

-- DropForeignKey
ALTER TABLE "usuario" DROP CONSTRAINT "fk_usuario_rol";

-- DropIndex
DROP INDEX "idx_empresa_id_usuario";

-- DropIndex
DROP INDEX "idx_estudiante_id_usuario";

-- AlterTable
ALTER TABLE "carrera" RENAME CONSTRAINT "pk_carrera" TO "carrera_pkey";

-- AlterTable
ALTER TABLE "convocatoria" RENAME CONSTRAINT "pk_convocatoria" TO "convocatoria_pkey";
ALTER TABLE "convocatoria"
ADD COLUMN     "area" VARCHAR(120) NOT NULL DEFAULT '',
ADD COLUMN     "fecha_limite" DATE,
ALTER COLUMN "descripcion" SET DEFAULT '',
ALTER COLUMN "cupos" SET DEFAULT 0,
ALTER COLUMN "contacto_nombre" SET DEFAULT '',
ALTER COLUMN "contacto_correo" SET DEFAULT '',
ALTER COLUMN "contacto_telefono" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "empresa" RENAME CONSTRAINT "pk_empresa" TO "empresa_pkey";
ALTER TABLE "empresa"
ADD COLUMN     "correo_contacto" VARCHAR(150),
ADD COLUMN     "estado_aprobacion" VARCHAR(10) NOT NULL DEFAULT 'pending',
ADD COLUMN     "id_logo" TEXT,
ADD COLUMN     "motivo_rechazo" TEXT,
ADD COLUMN     "resuelto_en" TIMESTAMPTZ,
ADD COLUMN     "resuelto_por" INTEGER,
ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "estudiante" RENAME CONSTRAINT "pk_estudiante" TO "estudiante_pkey";
ALTER TABLE "estudiante"
ADD COLUMN     "biografia" TEXT,
ADD COLUMN     "id_cv" TEXT,
ADD COLUMN     "id_foto" TEXT,
ALTER COLUMN "apellidos" SET DEFAULT '',
ALTER COLUMN "telefono" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "universidad" SET DEFAULT 'Universidad Autónoma de Sinaloa';

-- AlterTable
ALTER TABLE "postulacion" RENAME CONSTRAINT "pk_postulacion" TO "postulacion_pkey";
ALTER TABLE "postulacion"
ADD COLUMN     "empresa_respaldo" VARCHAR(150) NOT NULL DEFAULT '',
ADD COLUMN     "id_cv" TEXT,
ADD COLUMN     "titulo_respaldo" VARCHAR(150) NOT NULL DEFAULT '',
ALTER COLUMN "cv_s3_key" SET DEFAULT '';

-- AlterTable
ALTER TABLE "rol" RENAME CONSTRAINT "pk_rol" TO "rol_pkey";

-- AlterTable
ALTER TABLE "usuario" RENAME CONSTRAINT "pk_usuario" TO "usuario_pkey";
ALTER TABLE "usuario"
ADD COLUMN     "correo_verificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombre" VARCHAR(150) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "archivo" (
    "id_archivo" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "driver" VARCHAR(10) NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre_original" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "proposito" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivo_pkey" PRIMARY KEY ("id_archivo")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id_sesion" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "expira_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateTable
CREATE TABLE "verificacion_email" (
    "id_verificacion" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usado_en" TIMESTAMPTZ,

    CONSTRAINT "verificacion_email_pkey" PRIMARY KEY ("id_verificacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "archivo_clave_key" ON "archivo"("clave");

-- CreateIndex
CREATE INDEX "archivo_id_usuario_idx" ON "archivo"("id_usuario");

-- CreateIndex
CREATE INDEX "sesion_id_usuario_idx" ON "sesion"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "verificacion_email_hash_key" ON "verificacion_email"("hash");

-- CreateIndex
CREATE INDEX "verificacion_email_id_usuario_idx" ON "verificacion_email"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_id_usuario_key" ON "empresa"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "estudiante_id_usuario_key" ON "estudiante"("id_usuario");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiante" ADD CONSTRAINT "estudiante_id_foto_fkey" FOREIGN KEY ("id_foto") REFERENCES "archivo"("id_archivo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiante" ADD CONSTRAINT "estudiante_id_cv_fkey" FOREIGN KEY ("id_cv") REFERENCES "archivo"("id_archivo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiante" ADD CONSTRAINT "estudiante_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiante" ADD CONSTRAINT "estudiante_id_carrera_fkey" FOREIGN KEY ("id_carrera") REFERENCES "carrera"("id_carrera") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_resuelto_por_fkey" FOREIGN KEY ("resuelto_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_id_logo_fkey" FOREIGN KEY ("id_logo") REFERENCES "archivo"("id_archivo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatoria" ADD CONSTRAINT "convocatoria_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatoria_carrera" ADD CONSTRAINT "convocatoria_carrera_id_convocatoria_fkey" FOREIGN KEY ("id_convocatoria") REFERENCES "convocatoria"("id_convocatoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatoria_carrera" ADD CONSTRAINT "convocatoria_carrera_id_carrera_fkey" FOREIGN KEY ("id_carrera") REFERENCES "carrera"("id_carrera") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulacion" ADD CONSTRAINT "postulacion_id_convocatoria_fkey" FOREIGN KEY ("id_convocatoria") REFERENCES "convocatoria"("id_convocatoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulacion" ADD CONSTRAINT "postulacion_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "estudiante"("id_estudiante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulacion" ADD CONSTRAINT "postulacion_id_cv_fkey" FOREIGN KEY ("id_cv") REFERENCES "archivo"("id_archivo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verificacion_email" ADD CONSTRAINT "verificacion_email_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE convocatoria DROP CONSTRAINT ck_convocatoria_cupos;
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_cupos CHECK ((estado='BORRADOR' AND cupos>=0) OR cupos>0);
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_aprobacion CHECK (estado_aprobacion IN ('pending','approved','rejected'));
ALTER TABLE archivo ADD CONSTRAINT ck_archivo_driver CHECK (driver IN ('local','s3'));
UPDATE usuario u SET nombre=concat_ws(' ', e.nombre, nullif(e.apellidos,'')) FROM estudiante e WHERE e.id_usuario=u.id_usuario AND u.nombre='';
UPDATE usuario u SET nombre=e.razon_social FROM empresa e WHERE e.id_usuario=u.id_usuario AND u.nombre='';
UPDATE postulacion p SET titulo_respaldo=c.titulo, empresa_respaldo=e.razon_social FROM convocatoria c JOIN empresa e ON e.id_empresa=c.id_empresa WHERE p.id_convocatoria=c.id_convocatoria;
INSERT INTO rol(id_rol,nombre) VALUES (3,'ADMIN') ON CONFLICT DO NOTHING;
