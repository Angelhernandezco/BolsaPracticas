ALTER TABLE empresa ADD COLUMN fecha_inicio_convenio DATE, ADD COLUMN fecha_fin_convenio DATE;
ALTER TABLE empresa ADD CONSTRAINT ck_empresa_fechas_convenio CHECK (
 (fecha_inicio_convenio IS NULL AND fecha_fin_convenio IS NULL) OR
 (fecha_inicio_convenio IS NOT NULL AND fecha_fin_convenio IS NOT NULL AND fecha_fin_convenio >= fecha_inicio_convenio)
);
ALTER TABLE empresa DROP COLUMN tiene_convenio;
CREATE TABLE notificacion_aprobacion (
 id_notificacion TEXT NOT NULL PRIMARY KEY,
 id_empresa INTEGER NOT NULL UNIQUE REFERENCES empresa(id_empresa) ON DELETE RESTRICT ON UPDATE CASCADE,
 destinatario VARCHAR(150) NOT NULL,
 fecha_inicio_convenio DATE,
 fecha_fin_convenio DATE,
 estado VARCHAR(10) NOT NULL DEFAULT 'pending',
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 enviado_en TIMESTAMPTZ,
 claim_token TEXT,
 lease_hasta TIMESTAMPTZ,
 CONSTRAINT ck_notificacion_estado CHECK (estado IN ('pending','sending','sent','failed')),
 CONSTRAINT ck_notificacion_fechas CHECK ((fecha_inicio_convenio IS NULL AND fecha_fin_convenio IS NULL) OR (fecha_inicio_convenio IS NOT NULL AND fecha_fin_convenio IS NOT NULL AND fecha_fin_convenio >= fecha_inicio_convenio))
);
