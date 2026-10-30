# Entrega: carreras, convenios y organización frontend/backend

## Implementación

- Módulo administrativo de carreras: crear, renombrar, desactivar y reactivar, con nombre normalizado único e ID estable. Las asociaciones existentes se conservan y las inactivas no aparecen para nuevas selecciones.
- Empresas: se elimina el booleano de convenio y se añaden `fecha_inicio_convenio` y `fecha_fin_convenio`, ambas DATE y anulables en conjunto. Inicio, fin y estado tienen columnas separadas. La ficha de solicitudes permite capturar el periodo opcional al aprobar o guardarlo sin resolver.
- El navegador calcula la vigencia según su fecha local, con inicio/fin inclusivos y actualización al cambiar de día o recuperar el foco. El correo utiliza America/Mazatlan; las convocatorias mantienen su regla previa de fecha límite.
- La aprobación conserva una notificación persistente con copia de las fechas. Fallar el envío conserva la aprobación; el administrador puede reintentar desde el detalle. La reclamación atómica evita envíos paralelos y permite recuperar procesos interrumpidos.
- Frontend en `frontend/`, API Express JavaScript por módulos en `backend/`. Los comandos raíz coordinan ambos paquetes. Se conservan los flujos y estilos de Figma.
- SQL final y semillas fijas en `backend/sql/bolsa_practicas.sql`, generados desde Prisma y `fixtures/seed-data.json`. El manifiesto reúne cuentas demo/E2E, carreras, empresas, convocatorias, postulaciones y CV. No contiene usuarios privados ni registros aleatorios históricos de pruebas.
- `db:seed:assets` prepara los bytes del PDF demo sin sobrescribir archivos. El almacenamiento local sigue disponible y el adaptador S3 queda configurable.

## Validación

Verificación final consecutiva: `npm run typecheck` y `npm run build` correctos; `npm run test:backend`: 59/59; `npm run test:e2e`: 24/24. Se comprobaron la instalación SQL en esquemas aislados de la base `_test`, su equivalencia con Prisma, contraseñas demo públicas, ausencia de sesiones/tokens sembrados y lectura autorizada de los PDF. También se verificaron la salud de la API y una ruta profunda del frontend en los puertos locales habituales (HTTP 200).

Se revisaron capturas de carreras y empresas en móvil/escritorio y las pruebas de ficha de revisión en pantallas de poca altura. Los cambios preparados previamente por el usuario permanecen idénticos en el índice de Git; el frontend trasladado y sus integraciones permanecen disponibles en el árbol de trabajo para revisión conjunta.

## Revisión independiente

Un revisor independiente con contexto nuevo revisó el estado ejecutable. Los hallazgos importantes fueron dos regresiones del modo demo relacionadas con IDs/cambios del catálogo, y una ruta local de PostgreSQL en el test SQL. Las dos regresiones demo se reprodujeron antes de corregirse; el nuevo ejecutor SQL se incorporó después de observar fallar su prueba de aceptación. Este utiliza ahora Prisma, sin depender de `psql` instalado en una ubicación concreta.

Pendiente menor: el conflicto por nombre de carrera duplicado devuelve 409 correctamente y conserva el formulario, pero su mensaje todavía enumera otros tipos de dato duplicado. No afecta la unicidad ni el guardado.

## Decisiones y límites

1. Se reutilizó la rama de trabajo y se preservó el índice previo de Figma. Coste: los movimientos e integraciones del frontend deben revisarse como cambios locales junto con esa versión, antes de un commit conjunto.
2. Se amplió el espacio de RFC sintéticos de pruebas para evitar colisiones preexistentes. Coste: siguen siendo datos ficticios; no cambia la validación de producción.
3. Se acepta el límite SMTP documentado: una caída después de la aceptación del mensaje y antes de registrar el éxito puede duplicarlo al reintentar. Coste: entrega al menos una vez en esa ventana, sin promesa de exactamente una vez.
4. SMTP real y S3 real quedan fuera de la comprobación automática; se usan transportes capturados/simulados y almacenamiento local real. Coste: la entrega real y la configuración del bucket requieren comprobación en su entorno.
5. La refactorización general y arquitectura anterior quedan fuera de esta entrega aprobada. Coste: persiste código previo con su estilo original.
6. Se revisó el frontend ejecutable del árbol de trabajo y su diferencia contra la copia inicial, conservando los originales preparados. Coste: revisar solo HEAD no representa toda la aplicación entregada.
7. No se ejecutó publicación, despliegue, merge ni push. Coste: los cambios permanecen locales.
8. El revisor evitó ejecutar simultáneamente suites que escriben en la base de pruebas; la ejecución completa la realizó el implementador. Coste: la evidencia de ejecución no es una reproducción independiente.
9. El revisor no leyó secretos ni datos privados. Coste: su revisión no valida credenciales privadas ni transporte real.

Los convenios anteriores quedan sin fechas hasta que el administrador capture su periodo; no se inventó información histórica. No se eliminaron datos de la base existente ni se exportaron contraseñas privadas.

## Uso

Aplicación local: http://localhost:8443. Salud API: http://localhost:3001/api/health.

Consulta `README.md` y `backend/README.md` para arranque, migraciones, generación SQL y preparación de archivos. Las credenciales locales existentes permanecen en archivos ignorados.
