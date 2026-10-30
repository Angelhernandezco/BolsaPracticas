-- ============================================================
-- Bolsa Prácticas - Esquema PostgreSQL
-- Equipo: Los Ingenieritos
-- ============================================================


-- ------------------------------------------------------------
-- rol: catálogo de roles de acceso (estudiante y empresa)
-- ------------------------------------------------------------
CREATE TABLE rol (
    id_rol  SMALLINT    NOT NULL,
    nombre  VARCHAR(20) NOT NULL,
    CONSTRAINT pk_rol PRIMARY KEY (id_rol),
    CONSTRAINT uk_rol_nombre UNIQUE (nombre)
);

-- ------------------------------------------------------------
-- usuario: credenciales de acceso y rol
-- ------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario     INTEGER      GENERATED ALWAYS AS IDENTITY,
    id_rol         SMALLINT     NOT NULL,
    correo         VARCHAR(150) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    activo         BOOLEAN      NOT NULL DEFAULT true,
    fecha_registro TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT uk_usuario_correo UNIQUE (correo),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol)
);

-- ------------------------------------------------------------
-- carrera: catálogo de carreras universitarias
-- ------------------------------------------------------------
CREATE TABLE carrera (
    id_carrera INTEGER      GENERATED ALWAYS AS IDENTITY,
    nombre     VARCHAR(120) NOT NULL,
    CONSTRAINT pk_carrera PRIMARY KEY (id_carrera),
    CONSTRAINT uk_carrera_nombre UNIQUE (nombre)
);

-- ------------------------------------------------------------
-- estudiante: perfil del estudiante
-- ------------------------------------------------------------
CREATE TABLE estudiante (
    id_estudiante     INTEGER      GENERATED ALWAYS AS IDENTITY,
    id_usuario        INTEGER      NOT NULL,
    id_carrera        INTEGER      NOT NULL,
    nombre            VARCHAR(80)  NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    matricula         VARCHAR(20)  NOT NULL,
    telefono          VARCHAR(15),
    universidad       VARCHAR(120) NOT NULL,
    foto_s3_key       VARCHAR(255),
    cv_s3_key         VARCHAR(255),
    cv_actualizado_en TIMESTAMPTZ,
    CONSTRAINT pk_estudiante PRIMARY KEY (id_estudiante),
    CONSTRAINT uk_estudiante_matricula UNIQUE (matricula),
    CONSTRAINT fk_estudiante_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    CONSTRAINT fk_estudiante_carrera FOREIGN KEY (id_carrera)
        REFERENCES carrera (id_carrera)
);

-- ------------------------------------------------------------
-- empresa: perfil de la empresa
-- ------------------------------------------------------------
CREATE TABLE empresa (
    id_empresa     INTEGER      GENERATED ALWAYS AS IDENTITY,
    id_usuario     INTEGER      NOT NULL,
    razon_social   VARCHAR(150) NOT NULL,
    rfc            VARCHAR(13)  NOT NULL,
    descripcion    TEXT,
    giro           VARCHAR(100),
    telefono       VARCHAR(15),
    direccion      VARCHAR(255),
    tiene_convenio BOOLEAN      NOT NULL DEFAULT false,
    logo_s3_key    VARCHAR(255),
    CONSTRAINT pk_empresa PRIMARY KEY (id_empresa),
    CONSTRAINT uk_empresa_rfc UNIQUE (rfc),
    CONSTRAINT fk_empresa_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
);

-- ------------------------------------------------------------
-- convocatoria: vacantes publicadas por las empresas
-- ------------------------------------------------------------
CREATE TABLE convocatoria (
    id_convocatoria   INTEGER      GENERATED ALWAYS AS IDENTITY,
    id_empresa        INTEGER      NOT NULL,
    titulo            VARCHAR(150) NOT NULL,
    descripcion       TEXT         NOT NULL,
    cupos             INTEGER      NOT NULL,
    contacto_nombre   VARCHAR(100) NOT NULL,
    contacto_correo   VARCHAR(150) NOT NULL,
    contacto_telefono VARCHAR(15),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'BORRADOR',
    fecha_publicacion TIMESTAMPTZ,
    fecha_cierre      TIMESTAMPTZ,
    CONSTRAINT pk_convocatoria PRIMARY KEY (id_convocatoria),
    CONSTRAINT fk_convocatoria_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresa (id_empresa),
    CONSTRAINT ck_convocatoria_cupos CHECK (cupos > 0),
    CONSTRAINT ck_convocatoria_estado
        CHECK (estado IN ('BORRADOR', 'ABIERTA', 'CERRADA'))
);

-- ------------------------------------------------------------
-- postulacion: postulaciones de estudiantes a convocatorias
-- ------------------------------------------------------------
CREATE TABLE postulacion (
    id_postulacion    INTEGER      GENERATED ALWAYS AS IDENTITY,
    id_convocatoria   INTEGER      NOT NULL,
    id_estudiante     INTEGER      NOT NULL,
    cv_s3_key         VARCHAR(255) NOT NULL,
    estado            VARCHAR(12)  NOT NULL DEFAULT 'ENVIADA',
    fecha_postulacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_postulacion PRIMARY KEY (id_postulacion),
    CONSTRAINT uk_postulacion_conv_est UNIQUE (id_convocatoria, id_estudiante),
    CONSTRAINT fk_postulacion_convocatoria FOREIGN KEY (id_convocatoria)
        REFERENCES convocatoria (id_convocatoria),
    CONSTRAINT fk_postulacion_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES estudiante (id_estudiante),
    CONSTRAINT ck_postulacion_estado
        CHECK (estado IN ('ENVIADA', 'EN_REVISION', 'ACEPTADA', 'RECHAZADA'))
);

-- ------------------------------------------------------------
-- convocatoria_carrera: carreras a las que va dirigida cada convocatoria
-- ------------------------------------------------------------
CREATE TABLE convocatoria_carrera (
    id_convocatoria INTEGER NOT NULL,
    id_carrera      INTEGER NOT NULL,
    CONSTRAINT pk_convocatoria_carrera PRIMARY KEY (id_convocatoria, id_carrera),
    CONSTRAINT fk_convcar_convocatoria FOREIGN KEY (id_convocatoria)
        REFERENCES convocatoria (id_convocatoria),
    CONSTRAINT fk_convcar_carrera FOREIGN KEY (id_carrera)
        REFERENCES carrera (id_carrera)
);

-- ------------------------------------------------------------
-- Índices sobre llaves foráneas (PostgreSQL no los crea solo)
-- ------------------------------------------------------------
CREATE INDEX idx_usuario_id_rol              ON usuario (id_rol);
CREATE INDEX idx_estudiante_id_usuario       ON estudiante (id_usuario);
CREATE INDEX idx_estudiante_id_carrera       ON estudiante (id_carrera);
CREATE INDEX idx_empresa_id_usuario          ON empresa (id_usuario);
CREATE INDEX idx_convocatoria_id_empresa     ON convocatoria (id_empresa);
CREATE INDEX idx_convocatoria_estado         ON convocatoria (estado);
CREATE INDEX idx_postulacion_id_estudiante   ON postulacion (id_estudiante);
CREATE INDEX idx_convcar_id_carrera          ON convocatoria_carrera (id_carrera);

-- ------------------------------------------------------------
-- Datos iniciales del catálogo de roles
-- ------------------------------------------------------------
INSERT INTO rol (id_rol, nombre) VALUES
    (1, 'ESTUDIANTE'),
    (2, 'EMPRESA');