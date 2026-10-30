ALTER TABLE carrera ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE carrera ADD COLUMN clave_semilla TEXT;
CREATE UNIQUE INDEX carrera_clave_semilla_key ON carrera(clave_semilla);
CREATE UNIQUE INDEX carrera_nombre_normalizado_key ON carrera(lower(btrim(nombre)));
UPDATE carrera SET clave_semilla = CASE nombre
 WHEN 'Ingeniería en Software' THEN 'software'
 WHEN 'Ingeniería Informática' THEN 'informatica'
 WHEN 'Ingeniería Civil' THEN 'civil'
 WHEN 'Ingeniería Industrial' THEN 'industrial'
 WHEN 'Diseño Gráfico' THEN 'diseno'
 WHEN 'Administración de Empresas' THEN 'administracion'
 WHEN 'Contaduría Pública' THEN 'contaduria'
 WHEN 'Mercadotecnia' THEN 'mercadotecnia'
 END WHERE nombre IN ('Ingeniería en Software','Ingeniería Informática','Ingeniería Civil','Ingeniería Industrial','Diseño Gráfico','Administración de Empresas','Contaduría Pública','Mercadotecnia');
