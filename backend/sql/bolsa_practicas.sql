-- Instalación para BASE NUEVA. No ejecutar sobre una base existente.
-- Datos públicos de demostración; referencia: 2026-10-29. Sin sesiones ni tokens.
-- El PDF requiere npm run db:seed:assets. No contiene credenciales privadas.
BEGIN;
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
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "clave_semilla" TEXT,
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
    "fecha_inicio_convenio" DATE,
    "fecha_fin_convenio" DATE,
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

-- CreateTable
CREATE TABLE "notificacion_aprobacion" (
    "id_notificacion" TEXT NOT NULL,
    "id_empresa" INTEGER NOT NULL,
    "destinatario" VARCHAR(150) NOT NULL,
    "fecha_inicio_convenio" DATE,
    "fecha_fin_convenio" DATE,
    "estado" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_en" TIMESTAMPTZ,
    "claim_token" TEXT,
    "lease_hasta" TIMESTAMPTZ,

    CONSTRAINT "notificacion_aprobacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "uk_rol_nombre" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uk_usuario_correo" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "idx_usuario_id_rol" ON "usuario"("id_rol");

-- CreateIndex
CREATE UNIQUE INDEX "carrera_clave_semilla_key" ON "carrera"("clave_semilla");

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

-- CreateIndex
CREATE UNIQUE INDEX "notificacion_aprobacion_id_empresa_key" ON "notificacion_aprobacion"("id_empresa");

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

-- AddForeignKey
ALTER TABLE "notificacion_aprobacion" ADD CONSTRAINT "notificacion_aprobacion_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;



CREATE UNIQUE INDEX carrera_nombre_normalizado_key ON carrera(lower(btrim(nombre)));
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_estado CHECK (estado IN ('BORRADOR','ABIERTA','CERRADA'));
ALTER TABLE convocatoria ADD CONSTRAINT ck_convocatoria_cupos CHECK ((estado='BORRADOR' AND cupos>=0) OR cupos>0);
ALTER TABLE postulacion ADD CONSTRAINT ck_postulacion_estado CHECK (estado IN ('ENVIADA','EN_REVISION','ACEPTADA','RECHAZADA'));
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_aprobacion CHECK (estado_aprobacion IN ('pending','approved','rejected'));
ALTER TABLE archivo ADD CONSTRAINT ck_archivo_driver CHECK (driver IN ('local','s3'));
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_fechas_convenio CHECK ((fecha_inicio_convenio IS NULL AND fecha_fin_convenio IS NULL) OR (fecha_inicio_convenio IS NOT NULL AND fecha_fin_convenio IS NOT NULL AND fecha_fin_convenio>=fecha_inicio_convenio));
ALTER TABLE notificacion_aprobacion ADD CONSTRAINT ck_notificacion_estado CHECK (estado IN ('pending','sending','sent','failed'));
ALTER TABLE notificacion_aprobacion ADD CONSTRAINT ck_notificacion_fechas CHECK ((fecha_inicio_convenio IS NULL AND fecha_fin_convenio IS NULL) OR (fecha_inicio_convenio IS NOT NULL AND fecha_fin_convenio IS NOT NULL AND fecha_fin_convenio>=fecha_inicio_convenio));

-- INICIO SEMILLAS DEMO (contraseñas públicas: Demo1234 / E2E TestPassword123!)
INSERT INTO "rol" ("id_rol", "nombre") VALUES (1, 'ESTUDIANTE');
INSERT INTO "rol" ("id_rol", "nombre") VALUES (2, 'EMPRESA');
INSERT INTO "rol" ("id_rol", "nombre") VALUES (3, 'ADMIN');
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Ingeniería en Software', 'software', true, 1);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Ingeniería Informática', 'informatica', true, 2);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Ingeniería Civil', 'civil', true, 3);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Ingeniería Industrial', 'industrial', true, 4);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Diseño Gráfico', 'diseno', true, 5);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Administración de Empresas', 'administracion', true, 6);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Contaduría Pública', 'contaduria', true, 7);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Mercadotecnia', 'mercadotecnia', true, 8);
INSERT INTO "carrera" ("nombre", "clave_semilla", "activo", "id_carrera") VALUES ('Carrera histórica de demostración', 'legacy-demo', false, 9);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('mariana.lopez@uas.edu', 'Mariana López', 1, true, '2026-09-12T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 1);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('diego.ramirez@uas.edu', 'Diego Ramírez', 1, false, '2026-10-08T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 2);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('empresa@demo.mx', 'Nébula Digital', 2, true, '2026-08-20T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 3);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('empresa.sinverificar@demo.mx', 'Servicios del Pacífico', 2, false, '2026-10-09T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 4);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('pendiente@demo.mx', 'Constructora Delta', 2, true, '2026-10-07T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 5);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('rechazada@demo.mx', 'Comercial Nova', 2, true, '2026-09-28T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 6);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('agronova@demo.mx', 'AgroNova', 2, true, '2026-07-18T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 7);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('estudio@demo.mx', 'Estudio Norte', 2, true, '2026-06-03T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 8);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('admin@demo.mx', 'Administrador Bolsa Prácticas', 3, true, '2026-01-01T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 9);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('carlos.mendoza@uas.edu', 'Carlos Mendoza', 1, true, '2026-09-01T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 10);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('ana.ruiz@uas.edu', 'Ana Sofía Ruiz', 1, true, '2026-09-01T12:00:00.000Z', '$2b$12$y06A73GXZABpG3zCnxa1u.8eVgSA1.9MnKAM7tERHv3Y/L5qH2aem', 11);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('e2e-admin@example.com', 'Cuenta E2E', 3, true, '2026-10-01T12:00:00.000Z', '$2b$04$4DrwcADDKhK4oKYENg8sg./pNrchhUR8T/8DCKl03T77lWQSEac0O', 12);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('e2e-company@example.com', 'Empresa E2E', 2, true, '2026-10-01T12:00:00.000Z', '$2b$04$4DrwcADDKhK4oKYENg8sg./pNrchhUR8T/8DCKl03T77lWQSEac0O', 13);
INSERT INTO "usuario" ("correo", "nombre", "id_rol", "correo_verificado", "fecha_registro", "password_hash", "id_usuario") VALUES ('e2e-student@uas.edu', 'Cuenta E2E', 1, true, '2026-10-01T12:00:00.000Z', '$2b$04$4DrwcADDKhK4oKYENg8sg./pNrchhUR8T/8DCKl03T77lWQSEac0O', 14);
INSERT INTO "archivo" ("id_archivo", "id_usuario", "driver", "clave", "nombre_original", "tipo", "tamano", "proposito") VALUES ('d0000000-0000-4000-8000-000000000001', 1, 'local', 'd0000000-0000-4000-8000-000000000001', 'CV_Mariana_Lopez.pdf', 'application/pdf', 1915, 'cv');
INSERT INTO "archivo" ("id_archivo", "id_usuario", "driver", "clave", "nombre_original", "tipo", "tamano", "proposito") VALUES ('d0000000-0000-4000-8000-000000000010', 10, 'local', 'd0000000-0000-4000-8000-000000000010', 'CV_Carlos_Mendoza.pdf', 'application/pdf', 1915, 'cv');
INSERT INTO "archivo" ("id_archivo", "id_usuario", "driver", "clave", "nombre_original", "tipo", "tamano", "proposito") VALUES ('d0000000-0000-4000-8000-000000000011', 11, 'local', 'd0000000-0000-4000-8000-000000000011', 'CV_Ana_Ruiz.pdf', 'application/pdf', 1915, 'cv');
INSERT INTO "estudiante" ("id_usuario", "id_carrera", "nombre", "matricula", "telefono", "biografia", "id_cv", "cv_actualizado_en", "id_estudiante") VALUES (1, 1, 'Mariana López', '2023001842', '668 123 4567', 'Estudiante interesada en desarrollo frontend y productos digitales.', 'd0000000-0000-4000-8000-000000000001', '2026-10-01T12:00:00.000Z', 1);
INSERT INTO "estudiante" ("id_usuario", "id_carrera", "nombre", "matricula", "telefono", "biografia", "id_estudiante") VALUES (2, 3, 'Diego Ramírez', '2024002210', NULL, NULL, 2);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (3, 'Nébula Digital', 'NDI210315AB1', 'Tecnologías de la información', 'Blvd. Centenario 850, Los Mochis, Sinaloa', '668 246 8024', 'Creamos productos digitales útiles para organizaciones en crecimiento.', 'talento@nebuladigital.mx', 'approved', NULL, '2026-09-29T00:00:00.000Z', '2026-11-28T00:00:00.000Z', 1);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (4, 'Servicios del Pacífico', 'SPA220512AB2', 'Servicios profesionales', 'Av. Independencia 220, Culiacán, Sinaloa', NULL, NULL, NULL, 'pending', NULL, NULL, NULL, 2);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (5, 'Constructora Delta', 'CDE190822CD3', 'Construcción', 'Río Fuerte 412, Los Mochis, Sinaloa', '668 222 1144', 'Empresa regional de construcción e infraestructura.', NULL, 'pending', NULL, NULL, NULL, 3);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (6, 'Comercial Nova', 'CNO210101EF4', 'Comercio', 'Zona Centro, Guasave, Sinaloa', NULL, NULL, NULL, 'rejected', 'La información fiscal proporcionada no coincide con los datos del perfil.', NULL, NULL, 4);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (7, 'AgroNova', 'AGR200410GH5', 'Agrotecnología', 'Carretera México 15 km 12, Guasave', NULL, NULL, NULL, 'approved', NULL, '2026-08-30T00:00:00.000Z', '2026-10-28T00:00:00.000Z', 5);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (8, 'Estudio Norte', 'ENO180625IJ6', 'Diseño y comunicación', 'Ángel Flores 310, Culiacán', NULL, NULL, NULL, 'approved', NULL, '2026-11-08T00:00:00.000Z', '2027-01-27T00:00:00.000Z', 6);
INSERT INTO "estudiante" ("id_usuario", "id_carrera", "nombre", "matricula", "telefono", "biografia", "id_cv", "cv_actualizado_en", "id_estudiante") VALUES (10, 2, 'Carlos Mendoza', 'DEMO-student-2', '668 234 5678', 'Interesado en aseguramiento de calidad y automatización.', 'd0000000-0000-4000-8000-000000000010', '2026-10-29T12:00:00.000Z', 3);
INSERT INTO "estudiante" ("id_usuario", "id_carrera", "nombre", "matricula", "telefono", "biografia", "id_cv", "cv_actualizado_en", "id_estudiante") VALUES (11, 5, 'Ana Sofía Ruiz', 'DEMO-student-3', '668 345 6789', 'Diseñadora enfocada en experiencias digitales accesibles.', 'd0000000-0000-4000-8000-000000000011', '2026-10-29T12:00:00.000Z', 4);
INSERT INTO "empresa" ("id_usuario", "razon_social", "rfc", "giro", "direccion", "telefono", "descripcion", "correo_contacto", "estado_aprobacion", "motivo_rechazo", "fecha_inicio_convenio", "fecha_fin_convenio", "id_empresa") VALUES (13, 'Empresa E2E', 'E2E210101ABC', 'Tecnología', 'Dirección E2E', NULL, NULL, NULL, 'approved', NULL, NULL, NULL, 7);
INSERT INTO "estudiante" ("id_usuario", "id_carrera", "nombre", "matricula", "telefono", "biografia", "id_estudiante") VALUES (14, 1, 'Cuenta E2E', 'e2e-student', NULL, NULL, 5);
INSERT INTO "convocatoria" ("id_empresa", "titulo", "descripcion", "area", "cupos", "contacto_nombre", "contacto_correo", "contacto_telefono", "estado", "fecha_limite", "fecha_publicacion", "id_convocatoria") VALUES (1, 'Practicante de Desarrollo Frontend', 'Participa en el diseño y desarrollo de experiencias web para productos digitales. Trabajarás con React, TypeScript y un equipo multidisciplinario.', 'Tecnologías de la información', 3, 'Laura Mendoza', 'talento@nebuladigital.mx', '668 246 8024', 'ABIERTA', '2026-11-28T00:00:00.000Z', '2026-10-04T12:00:00.000Z', 1);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (1, 1);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (1, 2);
INSERT INTO "convocatoria" ("id_empresa", "titulo", "descripcion", "area", "cupos", "contacto_nombre", "contacto_correo", "contacto_telefono", "estado", "fecha_limite", "fecha_publicacion", "id_convocatoria") VALUES (5, 'Analista de Datos Jr.', 'Apoya al equipo de inteligencia de negocio en la limpieza, análisis y visualización de datos.', 'Ciencia de datos', 2, 'Óscar Vega', 'personas@agronova.mx', NULL, 'ABIERTA', '2026-11-16T00:00:00.000Z', '2026-10-02T12:00:00.000Z', 2);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (2, 1);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (2, 2);
INSERT INTO "convocatoria" ("id_empresa", "titulo", "descripcion", "area", "cupos", "contacto_nombre", "contacto_correo", "contacto_telefono", "estado", "fecha_limite", "fecha_publicacion", "id_convocatoria") VALUES (6, 'Prácticas de Diseño de Producto', 'Colabora en investigación de usuarios, prototipos y sistemas de diseño.', 'Diseño', 1, 'Sofía Ríos', 'hola@estudionorte.mx', NULL, 'ABIERTA', '2026-11-10T00:00:00.000Z', '2026-09-29T12:00:00.000Z', 3);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (3, 5);
INSERT INTO "convocatoria" ("id_empresa", "titulo", "descripcion", "area", "cupos", "contacto_nombre", "contacto_correo", "contacto_telefono", "estado", "fecha_limite", "fecha_publicacion", "id_convocatoria") VALUES (1, 'Practicante de QA y Automatización', 'Diseña pruebas y apoya la automatización de flujos críticos.', 'Tecnologías de la información', 2, 'Laura Mendoza', 'talento@nebuladigital.mx', NULL, 'ABIERTA', '2026-10-27T00:00:00.000Z', '2026-09-24T12:00:00.000Z', 4);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (4, 1);
INSERT INTO "convocatoria" ("id_empresa", "titulo", "descripcion", "area", "cupos", "contacto_nombre", "contacto_correo", "contacto_telefono", "estado", "fecha_limite", "fecha_publicacion", "id_convocatoria") VALUES (1, 'Soporte de infraestructura cloud', 'Apoyo al equipo de operaciones en documentación y monitoreo.', 'Infraestructura', 2, 'Laura Mendoza', 'talento@nebuladigital.mx', NULL, 'CERRADA', '2026-11-13T00:00:00.000Z', '2026-08-15T12:00:00.000Z', 5);
INSERT INTO "convocatoria_carrera" ("id_convocatoria", "id_carrera") VALUES (5, 2);
INSERT INTO "convocatoria" ("id_empresa", "titulo", "descripcion", "area", "cupos", "contacto_nombre", "contacto_correo", "contacto_telefono", "estado", "fecha_limite", "fecha_publicacion", "id_convocatoria") VALUES (1, 'Prácticas de soporte técnico', '', '', 0, '', '', NULL, 'BORRADOR', NULL, NULL, 6);
INSERT INTO "postulacion" ("id_convocatoria", "id_estudiante", "id_cv", "titulo_respaldo", "empresa_respaldo", "estado", "fecha_postulacion", "id_postulacion") VALUES (2, 1, 'd0000000-0000-4000-8000-000000000001', 'Analista de Datos Jr.', 'AgroNova', 'EN_REVISION', '2026-10-03T12:00:00.000Z', 1);
INSERT INTO "postulacion" ("id_convocatoria", "id_estudiante", "id_cv", "titulo_respaldo", "empresa_respaldo", "estado", "fecha_postulacion", "id_postulacion") VALUES (3, 1, 'd0000000-0000-4000-8000-000000000001', 'Prácticas de Diseño de Producto', 'Estudio Norte', 'ACEPTADA', '2026-10-01T12:00:00.000Z', 2);
INSERT INTO "postulacion" ("id_convocatoria", "id_estudiante", "id_cv", "titulo_respaldo", "empresa_respaldo", "estado", "fecha_postulacion", "id_postulacion") VALUES (1, 1, 'd0000000-0000-4000-8000-000000000001', 'Practicante de Desarrollo Frontend', 'Nébula Digital', 'ENVIADA', '2026-10-05T12:00:00.000Z', 3);
INSERT INTO "postulacion" ("id_convocatoria", "id_estudiante", "id_cv", "titulo_respaldo", "empresa_respaldo", "estado", "fecha_postulacion", "id_postulacion") VALUES (4, 1, 'd0000000-0000-4000-8000-000000000001', 'Practicante de QA y Automatización', 'Nébula Digital', 'EN_REVISION', '2026-09-26T12:00:00.000Z', 4);
INSERT INTO "postulacion" ("id_convocatoria", "id_estudiante", "id_cv", "titulo_respaldo", "empresa_respaldo", "estado", "fecha_postulacion", "id_postulacion") VALUES (1, 3, 'd0000000-0000-4000-8000-000000000010', 'Practicante de Desarrollo Frontend', 'Nébula Digital', 'EN_REVISION', '2026-10-02T12:00:00.000Z', 5);
INSERT INTO "postulacion" ("id_convocatoria", "id_estudiante", "id_cv", "titulo_respaldo", "empresa_respaldo", "estado", "fecha_postulacion", "id_postulacion") VALUES (1, 4, 'd0000000-0000-4000-8000-000000000011', 'Practicante de Desarrollo Frontend', 'Nébula Digital', 'RECHAZADA', '2026-09-30T12:00:00.000Z', 6);
SELECT setval(pg_get_serial_sequence('"usuario"', 'id_usuario'), COALESCE((SELECT MAX("id_usuario") FROM "usuario"),1), EXISTS(SELECT 1 FROM "usuario"));
SELECT setval(pg_get_serial_sequence('"carrera"', 'id_carrera'), COALESCE((SELECT MAX("id_carrera") FROM "carrera"),1), EXISTS(SELECT 1 FROM "carrera"));
SELECT setval(pg_get_serial_sequence('"estudiante"', 'id_estudiante'), COALESCE((SELECT MAX("id_estudiante") FROM "estudiante"),1), EXISTS(SELECT 1 FROM "estudiante"));
SELECT setval(pg_get_serial_sequence('"empresa"', 'id_empresa'), COALESCE((SELECT MAX("id_empresa") FROM "empresa"),1), EXISTS(SELECT 1 FROM "empresa"));
SELECT setval(pg_get_serial_sequence('"convocatoria"', 'id_convocatoria'), COALESCE((SELECT MAX("id_convocatoria") FROM "convocatoria"),1), EXISTS(SELECT 1 FROM "convocatoria"));
SELECT setval(pg_get_serial_sequence('"postulacion"', 'id_postulacion'), COALESCE((SELECT MAX("id_postulacion") FROM "postulacion"),1), EXISTS(SELECT 1 FROM "postulacion"));
COMMIT;
