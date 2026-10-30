-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SMALLINT NOT NULL,
    "nombre" VARCHAR(20) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "id_rol" SMALLINT NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correo_verificado" BOOLEAN NOT NULL DEFAULT false,
    "nombre" VARCHAR(150) NOT NULL DEFAULT '',

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "carrera" (
    "id_carrera" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "carrera_pkey" PRIMARY KEY ("id_carrera")
);

-- CreateTable
CREATE TABLE "estudiante" (
    "id_estudiante" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_carrera" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL DEFAULT '',
    "matricula" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(30),
    "universidad" VARCHAR(120) NOT NULL DEFAULT 'Universidad Autónoma de Sinaloa',
    "biografia" TEXT,
    "foto_s3_key" VARCHAR(255),
    "cv_s3_key" VARCHAR(255),
    "cv_actualizado_en" TIMESTAMPTZ,
    "id_foto" TEXT,
    "id_cv" TEXT,

    CONSTRAINT "estudiante_pkey" PRIMARY KEY ("id_estudiante")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id_empresa" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "razon_social" VARCHAR(150) NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "descripcion" TEXT,
    "giro" VARCHAR(100),
    "telefono" VARCHAR(30),
    "direccion" VARCHAR(255),
    "correo_contacto" VARCHAR(150),
    "tiene_convenio" BOOLEAN NOT NULL DEFAULT false,
    "logo_s3_key" VARCHAR(255),
    "id_logo" TEXT,
    "estado_aprobacion" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "motivo_rechazo" TEXT,
    "resuelto_en" TIMESTAMPTZ,
    "resuelto_por" INTEGER,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id_empresa")
);

-- CreateTable
CREATE TABLE "convocatoria" (
    "id_convocatoria" SERIAL NOT NULL,
    "id_empresa" INTEGER NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "area" VARCHAR(120) NOT NULL DEFAULT '',
    "cupos" INTEGER NOT NULL DEFAULT 0,
    "contacto_nombre" VARCHAR(100) NOT NULL DEFAULT '',
    "contacto_correo" VARCHAR(150) NOT NULL DEFAULT '',
    "contacto_telefono" VARCHAR(30),
    "estado" VARCHAR(10) NOT NULL DEFAULT 'BORRADOR',
    "fecha_publicacion" TIMESTAMPTZ,
    "fecha_limite" DATE,
    "fecha_cierre" TIMESTAMPTZ,

    CONSTRAINT "convocatoria_pkey" PRIMARY KEY ("id_convocatoria")
);

-- CreateTable
CREATE TABLE "convocatoria_carrera" (
    "id_convocatoria" INTEGER NOT NULL,
    "id_carrera" INTEGER NOT NULL,

    CONSTRAINT "pk_convocatoria_carrera" PRIMARY KEY ("id_convocatoria","id_carrera")
);

-- CreateTable
CREATE TABLE "postulacion" (
    "id_postulacion" SERIAL NOT NULL,
    "id_convocatoria" INTEGER NOT NULL,
    "id_estudiante" INTEGER NOT NULL,
    "cv_s3_key" VARCHAR(255) NOT NULL DEFAULT '',
    "id_cv" TEXT,
    "titulo_respaldo" VARCHAR(150) NOT NULL DEFAULT '',
    "empresa_respaldo" VARCHAR(150) NOT NULL DEFAULT '',
    "estado" VARCHAR(12) NOT NULL DEFAULT 'ENVIADA',
    "fecha_postulacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postulacion_pkey" PRIMARY KEY ("id_postulacion")
);

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
CREATE UNIQUE INDEX "uk_rol_nombre" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uk_usuario_correo" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "idx_usuario_id_rol" ON "usuario"("id_rol");

-- CreateIndex
CREATE UNIQUE INDEX "uk_carrera_nombre" ON "carrera"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estudiante_id_usuario_key" ON "estudiante"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "uk_estudiante_matricula" ON "estudiante"("matricula");

-- CreateIndex
CREATE INDEX "idx_estudiante_id_carrera" ON "estudiante"("id_carrera");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_id_usuario_key" ON "empresa"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "uk_empresa_rfc" ON "empresa"("rfc");

-- CreateIndex
CREATE INDEX "idx_convocatoria_id_empresa" ON "convocatoria"("id_empresa");

-- CreateIndex
CREATE INDEX "idx_convocatoria_estado" ON "convocatoria"("estado");

-- CreateIndex
CREATE INDEX "idx_convcar_id_carrera" ON "convocatoria_carrera"("id_carrera");

-- CreateIndex
CREATE INDEX "idx_postulacion_id_estudiante" ON "postulacion"("id_estudiante");

-- CreateIndex
CREATE UNIQUE INDEX "uk_postulacion_conv_est" ON "postulacion"("id_convocatoria", "id_estudiante");

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
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_estado CHECK (estado IN ('BORRADOR','ABIERTA','CERRADA'));
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_cupos CHECK ((estado='BORRADOR' AND cupos>=0) OR cupos>0);
ALTER TABLE postulacion ADD CONSTRAINT ck_postulacion_estado CHECK (estado IN ('ENVIADA','EN_REVISION','ACEPTADA','RECHAZADA'));
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_aprobacion CHECK (estado_aprobacion IN ('pending','approved','rejected'));
ALTER TABLE archivo ADD CONSTRAINT ck_archivo_driver CHECK (driver IN ('local','s3'));
INSERT INTO rol(id_rol,nombre) VALUES (1,'ESTUDIANTE'),(2,'EMPRESA'),(3,'ADMIN');
