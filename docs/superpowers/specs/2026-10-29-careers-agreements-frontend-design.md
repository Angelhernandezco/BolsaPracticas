# Carreras administrativas, convenios por fechas y separación del frontend

Fecha: 2026-10-29. Estado: pendiente de aprobación del diseño completo.

## Propósito y restricciones

Ampliar Bolsa Prácticas sobre su versión funcional actual: administración de carreras, convenios empresariales por fechas, correo al aprobar empresas, semillas reproducibles en SQL y frontend dentro de frontend/. Conservar estilos de Figma, navegación, permisos y flujos salvo los cambios solicitados. El backend sigue en Express JavaScript y el frontend en React TypeScript. No ejecutar la refactorización general anterior, que quedó sin aprobación. No hacer merge ni push.

Conservar los cambios locales existentes, incluidos archivos aún sin commit. Ningún dato de prueba existente debe borrarse por esta solicitud: el usuario pidió incorporarlos al SQL, no limpiar bases.

## Enfoques

Elegido por el usuario: agregar estado a carreras y dos fechas a la empresa. No crear historial de convenios. La alternativa de una tabla de periodos/historial añade complejidad no solicitada y se descarta.

La primera propuesta calculaba vigencia con fecha Mazatlán. El usuario la corrigió: el estado visible del convenio se calcula en el navegador de quien lo consulta, con su fecha local. El correo no tiene navegador; este diseño propone usar America/Mazatlan en el backend al enviar el mensaje, indicando la referencia temporal. No se modifica la regla de vencimiento de convocatorias, que sigue en Mazatlán.

## Carreras

- Agregar activo BOOLEAN NOT NULL DEFAULT true a carrera. Las etiquetas visibles serán Activo/Inactivo.
- Nueva ruta /admin/carreras y enlace en el menú administrativo, con componentes de tabla, tarjetas, búsqueda, filtros, avisos y modales existentes. Tabla: nombre, estado y acción para desactivar; formulario para crear una carrera activa. Solo rol admin puede administrar carreras.
- No añadir eliminación, cambio de nombre ni reactivación en esta entrega: el alcance confirmado es crear y desactivar. Un nombre ya existente, incluso inactivo, no se duplica. Comparar nombres normalizados para evitar duplicados por espacios exteriores o mayúsculas; no fusionar silenciosamente registros previos.
- El catálogo para nuevas elecciones solo ofrece carreras activas. El backend también rechaza carreras inactivas en registros o nuevas asociaciones de convocatorias, aunque el cliente manipule la petición.
- Una carrera desactivada conserva usuarios, convocatorias, postulaciones y sus relaciones. El estudiante que ya la tiene puede conservarla al guardar otros datos; no puede asignarse una carrera inactiva diferente. Una convocatoria existente puede conservar carreras inactivas que ya tenía; nuevas convocatorias no pueden incorporarlas.
- Los formularios de edición muestran sus carreras actuales inactivas claramente identificadas, sin obligar a perderlas. La desactivación no cierra convocatorias ni bloquea acceso de estudiantes existentes.
- La semilla idempotente no reactiva carreras que el administrador haya desactivado.

## Convenios: datos y validación

- Eliminar tiene_convenio y su propiedad hasUasAgreement del modelo y contratos internos/cliente. Sustituir por fecha_inicio_convenio DATE NULL y fecha_fin_convenio DATE NULL, con propiedades API agreementStartDate y agreementEndDate, YYYY-MM-DD o null.
- Pareja opcional: ambas null o ambas fechas completas. Inicio menor o igual a fin. Validar fechas de calendario reales y la misma regla en API y base. Permitir fechas pasadas y futuras: se necesitan estados vencido y próximo.
- No almacenar un campo de estado/vigencia ni boolean derivado en la tabla empresarial. La API entrega fechas en DTO de empresa y de convocatoria; se calcula el estado en la interfaz.
- Las fechas se mantienen como fechas de calendario, sin convertirlas con UTC al mostrarlas. El navegador obtiene hoy de año/mes/día locales. Estados: ambas vacías => Sin convenio; hoy anterior a inicio => Próximo a iniciar; inicio <= hoy <= fin => Activo; hoy posterior a fin => Vencido. El último día es inclusivo.
- Una utilidad de frontend compartida calcula el estado y se actualiza al pasar la medianoche local o al recuperar foco/visibilidad. No depende de recargar toda la aplicación. No usar el reloj del navegador para autorizar acciones del backend: el convenio es informativo y no condiciona aprobación/publicación/postulación.
- Eliminar todas las dependencias del boolean, incluidos mocks, pruebas y vistas de estudiante/empresa/administrador. Mostrar estado y fechas donde antes se mostraba el indicador, especialmente detalle de convocatoria del estudiante.
- Solo admin edita fechas. La empresa las consulta sin poder alterarlas mediante perfil ni manipulación de payload.

## Interfaz administrativa

- /admin/empresas conserva su tabla y reemplaza la columna del checkbox por tres columnas separadas: Inicio de convenio, Fin de convenio, Estado del convenio. Sin fechas, mostrar un guion en ambas columnas y Sin convenio en estado. Vencido y Próximo a iniciar con badge/aviso coherente con Figma.
- Una acción de editar convenio abre modal con los dos inputs date; permite guardar o borrar ambas fechas. Evitar guardar al cambiar cada fecha individual, porque el par debe validarse en conjunto.
- /admin/solicitudes incorpora los mismos inputs en la ficha, con texto: "Fechas de convenio opcionales: complétalas únicamente si la empresa ya cuenta con convenio". Se pueden guardar sin resolver o guardar junto con la aprobación/rechazo.
- Si se aprueba/rechaza desde la ficha con cambios pendientes de fechas, enviarlos junto con la decisión y persistirlos en la misma transacción. El correo de aprobación usa exactamente ese periodo guardado.
- Mantener aprobación independiente del convenio. Empresa sin fechas, con periodo futuro o vencido puede ser aprobada. No enviar correo de aprobación por solo guardar fechas o rechazar.
- Modales con encabezado/pie accesibles y cuerpo con scroll, siguiendo la solución responsive existente.

## Correo al aprobar empresa

- Extender el servicio Nodemailer existente. Destinatario: correo de la cuenta empresarial aprobada, no el correo alternativo de contacto de sus convocatorias.
- Indicar que su cuenta fue aceptada y puede acceder al panel. Incluir enlace de acceso desde FRONTEND_URL configurado.
- Convenio activo: indicar vigencia y ambas fechas, sin hora. Sin convenio: indicarlo y explicar "Los estudiantes que se postulen podrán proporcionarte más información sobre el proceso de convenio". Vencido: aviso explícito, fechas del periodo anterior y esa misma orientación. Próximo a iniciar: indicar que aún no está activo y ambas fechas, además de la orientación mientras no esté vigente.
- Clasificación del correo calculada en backend con reloj inyectable y fecha America/Mazatlan al enviarlo; no tomar un texto/estado arbitrario enviado por el cliente. El mensaje representa la situación en ese momento; la interfaz continúa calculando el estado con la fecha local de su navegador.
- Aprobación y registro de notificación pendiente se persisten juntos. Intentar enviar después del commit. Si falla SMTP, conservar aprobación, mostrar aviso al admin y permitir reintentar desde detalle empresarial; no comunicar éxito de envío si no se aceptó en SMTP ni deshacer la aprobación.
- Persistir resultado de notificación para no enviar otra por recargas/reintentos de decisión. Reintentos controlados solo de notificaciones pendientes/fallidas y sin envíos concurrentes duplicados. Sin servicios externos, nuevos paquetes de colas ni recordatorios automáticos de vencimiento.
- Pruebas capturan correos. No enviar mensajes de prueba a los destinatarios ficticios de las semillas. El uso real del botón aprobar sobre una empresa registrada sí envía la notificación solicitada.

## Migraciones y compatibilidad

- Migración versionada agrega carrera.activo y fechas empresariales con restricción de pareja/orden; elimina el boolean empresarial y amplía serializadores. Agrega persistencia mínima de la notificación de aprobación (registro con estado, destinatario y fecha de envío).
- No inventar periodos para convenios existentes que solo tienen true/false. Al migrar quedarán sin fechas y se verán como Sin convenio hasta que admin capture el periodo. Esta es una consecuencia de eliminar el indicador antiguo sin contar con fechas históricas.
- Inspeccionar estructura antes de aplicar; conservar usuarios, expedientes, CV, solicitudes y convocatorias. No reset, DROP TABLE de negocio ni limpieza masiva.
- Mantener rutas de negocio actuales. La ruta administrativa de actualización de convenio puede conservar /admin/companies/:id/uas-agreement cambiando su payload a la pareja de fechas solicitada. Añadir rutas de carreras y reintento de notificación; no usar campos de privilegio en PUT genérico de perfiles.
- Mantener GET /catalogs/careers como lista de nombres de carreras activas para conservar el consumidor de registro; administración dispone de catálogo completo con id, nombre y activo. Los DTO de edición incluyen sus asociaciones antiguas para representarlas sin reintroducirlas como opciones nuevas.

## SQL y semillas reproducibles

- Actualizar backend/sql/bolsa_practicas.sql con CREATE TABLE/índices/restricciones finales y sección claramente marcada de datos de demostración. No incluir credenciales reales, administrador privado, sesiones válidas ni tokens de verificación.
- Incluir todos los conjuntos fijos de semillas utilizados: roles, carreras, cuentas demo de cada estado/rol (incluidos los ejemplos fijos de la capa de API), cuentas fijas de pruebas E2E, perfiles, convocatorias, asociaciones, postulaciones y metadatos del CV de ejemplo. Añadir datos fijos para carrera inactiva y periodos de convenio activo, vencido, futuro y ausente.
- Los datos aleatorios generados por cada ejecución de tests son transitorios; no volcar miles de registros repetidos de bases de pruebas. Sus escenarios se representan en el conjunto reproducible y los tests siguen generando sus propios usuarios aislados.
- Mantener una única definición compartida de semillas que sirva para generar SQL y los scripts de desarrollo; evitar que SQL y seed.js diverjan. Hashes bcrypt solo de contraseñas públicas de demostración, nunca de la cuenta administrativa privada.
- El SQL de instalación sigue siendo para una base nueva. Una sección demo explícita evita confundirlo con datos productivos. Usar claves/referencias deterministas y ajustar secuencias cuando se inserten IDs explícitos.
- Un archivo SQL no restaura bytes en almacenamiento local: incluir utilitario de preparación de recursos de ejemplo que copie el PDF incluido a las claves deterministas referenciadas, sin reemplazar archivos de usuarios. Documentar y probar SQL más ese paso. No insertar referencias a rutas de otros equipos ni S3 de prueba inexistente.

## Traslado a frontend/

- Mover src/, public/, index.html, vite.config.ts, tsconfig.json, declaraciones y configuración/ejemplos de entorno del frontend a frontend/. Conservar contenido y modificaciones locales; mover la configuración Figma necesaria con la app, sin mover datos internos del harness como .git, .agents o directorios de plugins.
- frontend/package.json y lockfile propios para React/Vite. backend/ permanece como paquete separado en JavaScript. La raíz conserva documentación, Git, scripts de coordinación y pruebas E2E del conjunto; package.json raíz solo coordina comandos y dependencias necesarias de pruebas.
- Mantener comandos cómodos desde raíz para dev, build, typecheck y tests, redirigiéndolos al paquete correcto. No introducir framework de monorepo ni dependencias de coordinación innecesarias.
- Ajustar alias @, configuración Figma, proxy /api, ruta del build a frontend/dist, seed de PDF, fixtures/servidor Playwright, pruebas backend que usaban dist y documentación. Conservar URLs de navegador y endpoints /api.
- Mover configuración local ignorada sin exponer secretos. No copiar node_modules como código: reinstalar/resolver dependencias con lockfiles del paquete y verificar comandos desde raíz y paquetes.

## Verificación de aceptación

- Carreras: creación/duplicados, solo admin, activas en catálogo, rechazo de nuevas asociaciones inactivas y conservación de las antiguas; semilla no reactiva.
- Convenios: null/null, pareja incompleta rechazada, fechas inválidas/invertidas, límites inclusivos, año bisiesto, estados activo/vencido/futuro/ausente y diferencia entre fecha local de navegador y Mazatlán. Estado visible se actualiza al cambiar de día/foco sin persistirlo.
- Administración: tres columnas, edición sin checkbox, ficha opcional, aprobación con fechas transaccionales, permisos de empresa solo lectura, rechazo sin correo.
- Correo: cuatro estados de convenio, fechas y destinatario correctos, una notificación por resolución, fallo SMTP conserva aprobación y permite reintento controlado.
- SQL: instalar en base nueva aislada; comparar esquema con Prisma y escenarios de semillas; preparar CV de ejemplo y comprobar descarga autorizada. No modificar datos de la base de usuario durante tests.
- Traslado: build/typecheck, arranque, proxy, assets/iframe PDF, rutas profundas y modo Express sirviendo frontend/dist. Ejecutar suite backend y E2E existentes ampliadas; inspección visual de tablas y modales en escritorio y móvil.

## Decisiones del implementador

Nombres internos de funciones, desglose exacto de componentes reutilizados, endpoints nuevos coherentes con API actual, mecanismo mínimo de persistencia/reintento de correo y comandos de generación de SQL. Conservar estilo del proyecto al tocar estas partes; no convertir esta entrega en la refactorización general pendiente.
