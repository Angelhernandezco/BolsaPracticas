# Diseño de integración de Bolsa Prácticas

Fecha: 2026-10-29. Estado: aprobado por el usuario, incluida la aceptación de @uas.edu y @uas.edu.mx.

## Intención y alcance

Conectar el frontend actual de Figma Make con un backend Express en JavaScript, Prisma ORM, PostgreSQL y JWT. Conservar pantallas y flujos de estudiante, empresa y administrador. Usar el documento E1_LosIngenieritos_6oct2026.pdf y el SQL adjunto como referencia del dominio; las decisiones explícitas de la conversación y los flujos recientes del repositorio determinan el alcance actual.

La entrega debe funcionar localmente con persistencia real y correo de verificación por Gmail. Incluir un adaptador S3 configurable, sin exigir recursos AWS para ejecutar localmente. No incluye desplegar infraestructura en AWS, chat, aplicación móvil ni funciones administrativas adicionales.

Los cambios de Figma que ya están sin commit son trabajo del usuario y se conservan. No reorganizar ni convertir el frontend de TypeScript a JavaScript: JavaScript es la restricción del backend nuevo.

## Enfoques considerados

1. Express organizado por módulos: rutas, controladores y servicios por dominio, Prisma compartido y servicio de almacenamiento. Favorece permisos consistentes y pruebas sin arquitectura innecesaria. Elegido por el usuario.
2. Express concentrado en pocos archivos: menor estructura inicial, pero mezcla autenticación, permisos, persistencia y archivos; descartado por mantenibilidad.

El usuario eligió almacenamiento local con soporte configurable para S3. JWT en cookie HttpOnly y organización concreta de módulos son propuestas técnicas de este diseño.

## Arquitectura y ejecución

- Mantener el frontend en la raíz; agregar backend/ con package.json propio, código JavaScript ESM, prisma/, src/ y tests/.
- Módulos: auth, catalogs, profiles, opportunities, applications, admin; compartidos para configuración, Prisma, errores, permisos, correo y almacenamiento.
- Exponer API bajo /api. En desarrollo Vite redirige /api hacia Express; frontend con VITE_API_URL=/api. Conservar los plugins de Figma. Documentar ejecución separada y un comando cómodo para ambos procesos si resulta útil.
- En producción local opcional Express puede servir dist/ y la API en un mismo origen. Para orígenes separados permitir únicamente los orígenes configurados y credentials; no CORS abierto.
- .env local para secretos; .env.example solo con valores de ejemplo sin credenciales. Ninguna contraseña, token, conexión privada ni clave de Gmail se incorpora al frontend, SQL, documentación, commits o logs.

## Sesión, acceso y validación

- Hash de contraseñas con bcrypt; validación de entradas en el servidor y restricciones de unicidad en PostgreSQL.
- JWT con expiración de 8 horas en cookie HttpOnly, SameSite=Lax y Secure en HTTPS. Middleware verifica firma, expiración, usuario activo y estado vigente consultando la base; no confiar en rol o identidad recibidos en el cuerpo.
- Sesiones persistidas con identificador y expiración para poder revocar al cerrar sesión. El JWT referencia una sesión válida; logout la revoca y borra cookie. Rechazar mutaciones desde orígenes ajenos mediante validación de Origin y configuración de mismo origen; GET sin efectos de escritura de negocio.
- /auth/session devuelve usuario seguro o 401 sin sesión. Conservar la distinción frontend entre visita anónima y sesión vencida. Login inválido no dispara redirección de expiración; 403 tampoco cierra sesión.
- Registro público solo student/company; admin se crea mediante comando o semilla controlada con contraseña de configuración, nunca asignable por registro ni edición de perfil.
- Estudiantes: aceptar cualquiera de los dominios exactos @uas.edu o @uas.edu.mx, normalizando espacios exteriores y mayúsculas; rechazar subdominios y sufijos adicionales. Aplicar la misma regla en validaciones, mensajes y ejemplos del frontend y backend. Matrícula única, carrera existente y universidad fija Universidad Autónoma de Sinaloa.
- Empresas: RFC de formato válido y único, giro y dirección. Correo verificado y aprobación obligatorios para panel y API empresarial. Pendientes/rechazadas solo consultan sesión, verifican correo y cierran sesión.
- Estudiante verificado accede a convocatorias y sus propias postulaciones; empresa aprobada solo administra sus convocatorias y candidatos. Admin solo consulta empresas y cantidades, resuelve solicitudes y edita convenio; no puede consultar CV, estudiantes ni administrar convocatorias.
- No permitir cambiar rol, correo, verificación, convenio o aprobación mediante actualización genérica del perfil. Limitar tamaño de cuerpos, validar archivos y limitar intentos de login y reenvío.

## Verificación real de correo

- Nodemailer por SMTP Gmail usando EMAIL_USER y EMAIL_PASSWORD en .env. FRONTEND_URL configurable construye enlaces hacia /verificar-email?token=...; no derivar URL de cabeceras no confiables.
- Al registrar, persistir usuario y solicitud empresarial si corresponde, crear sesión y solicitar envío de verificación. Si SMTP falla, conservar cuenta pendiente, registrar error sin secretos y permitir reintento desde la pantalla existente; no informar envío exitoso falsamente.
- Tokens aleatorios, guardar solo hash, expiración de 24 horas y uso único. Reenvío con espera mínima de 60 segundos controlada por servidor; nuevo token invalida anteriores. Respuestas contemplan success, invalid, expired y already_verified de forma compatible con frontend.
- Verificar no debe iniciar sesión como otro usuario ni sustituir la sesión de un usuario diferente. Si el token corresponde a la sesión actual, devolver usuario actualizado; si no hay sesión o es de otra persona, confirmar verificación y remitir al acceso normal sin emitir identidad ajena.
- Eliminar enlace de demostración y mensaje de simulación en modo API. Mantener estructura y ruta existentes. Ningún token real debe devolverse al navegador por el endpoint de reenvío.
- Las pruebas automáticas usan transporte de correo capturable sin SMTP externo. Comprobar conexión SMTP real y, si se requiere comprobar entrega, usar únicamente el buzón proporcionado por el usuario; no enviar pruebas a direcciones institucionales inventadas.

## Empresas y administrador

- Estado pendiente por defecto, convenio false. Aprobar/rechazar requiere empresa pendiente con correo verificado; rechazar exige motivo. Guardar fecha y administrador responsable.
- Convenio independiente de aprobación y editable únicamente por admin desde tabla y ficha de revisión, incluso sin resolver la solicitud.
- Conservar método específico de convenio y método de resolución; cada operación es atómica y la resolución comprueba estado vigente para evitar resoluciones concurrentes incompatibles.
- La API de empresas devuelve solo datos seguros y número real de convocatorias incluyendo borradores y cerradas.
- El detalle de convocatoria devuelve hasUasAgreement de la empresa vigente; mostrar texto explícito “Con convenio con la UAS” o “Sin convenio con la UAS”, con estilo existente. No usar una copia desactualizada del indicador.

## Convocatorias y postulaciones

- Conservar contratos frontend y nombres de estados externos draft/open/closed; mapear a SQL BORRADOR/ABIERTA/CERRADA. Carreras múltiples mediante tabla puente; conservar los nombres de carrera que usa actualmente careerIds y mapearlos a identificadores internos sin rehacer formularios.
- Borrador requiere título, permite campos incompletos; esquema debe admitir null o valores vacíos apropiados en campos que se completan al publicar. Publicar exige descripción, área, cupos enteros positivos, contacto nombre/correo, al menos una carrera y fecha válida.
- closingDate es SQL DATE (YYYY-MM-DD). Acepta hoy o posterior. El plazo termina al comenzar el día siguiente en America/Mazatlan. Servidor determina estado efectivo y bloquea postulaciones después del plazo; no depende del reloj del navegador ni de una tarea programada.
- Separar fecha límite de fecha de cierre manual. Conservar fecha de publicación al editar/reactivar. Reactivar plazo vencido exige editar primero la fecha según flujo existente.
- Listado normal del estudiante solo abiertas vigentes; listado all conserva datos necesarios para las páginas actuales con control por rol: empresa solo propias, estudiante convocatorias publicadas abiertas/cerradas, nunca borradores.
- Detalle cerrado sigue disponible para estudiantes verificados, especialmente desde postulaciones. Borradores solo para propietario.
- Postular exige perfil completo y CV persistido, convocatoria vigente y estudiante verificado. Restricción única convocatoria/estudiante y comprobaciones transaccionales evitan duplicados y carreras con cierre concurrente. Carreras orientan, no restringen postular.
- Cupos representan plazas anunciadas; ni postular ni cambiar estado de candidatura descuenta automáticamente cupos, preservando comportamiento existente.
- Postulación conserva referencia al archivo CV exacto al postular y título/empresa de respaldo para historial; cerrar convocatoria no altera estado ni borra historial. Respuesta incluye títulos, empresa y estado efectivo sin depender del catálogo abierto.
- Estados de postulación ENVIADA, EN_REVISION, ACEPTADA, RECHAZADA, modificables solo por empresa propietaria; mantener cambios permitidos por el frontend, sin reglas adicionales de selección.

## Archivos: local y S3

- Servicio común put/get o stream/delete con STORAGE_DRIVER=local|s3. Base guarda claves opacas y metadatos, no rutas absolutas, data URLs ni blob URLs. Cada archivo guarda driver, tipo, tamaño, nombre original, propietario y propósito; cambiar driver no rompe archivos anteriores.
- Local por defecto en backend/storage/, excluido de Git; nombres generados y protección contra traversal. S3 implementado mediante SDK con región/bucket configurables, credenciales estándar del SDK o rol IAM; sin claves AWS obligatorias para modo local.
- S3 mantiene bucket privado. La API autoriza antes de transmitir archivo o emitir URL firmada breve. No publicar directorio de CV ni permisos públicos de bucket.
- CV PDF máximo 5 MB; foto/logo JPG o PNG máximo 2 MB, validando tipo y firma del contenido, no solo extensión/MIME declarado. Conservar límites visibles existentes.
- Subida de CV multipart real desde File; fotos/logos pueden convertir los data URLs actuales a subidas desde el servicio de frontend para conservar selectores actuales. Respuestas con URLs de API aptas para iframe, descarga e imágenes y cookies del mismo origen.
- Propietario lee CV actual; empresa solo CV referenciado por postulaciones de sus convocatorias. Admin y otras empresas reciben denegación. Fotos/logos se exponen solo a usuarios autenticados que necesitan verlos en flujos existentes.
- Reemplazar CV no borra versiones usadas en postulaciones. Retirar archivos nuevos si falla su asociación a base; conservar archivos referenciados. No se incluye migración automática masiva de local a S3; documentar que ambos drivers pueden servir archivos según sus metadatos.

## Datos y SQL

- Prisma como fuente del modelo y migraciones versionadas. Crear SQL de instalación con CREATE TABLE, índices y restricciones coherentes con migraciones, sin DROP TABLE ni secretos. Incluir rol admin, sesiones, tokens de verificación y archivos además de entidades originales.
- Campos nuevos: verificación/fecha en usuario; aprobación, motivo, resolución y contacto empresarial; matrícula y biografía; área, contactos separados, borradores incompletos y fecha límite DATE; archivo CV y datos de respaldo en postulación.
- Un perfil por usuario mediante UNIQUE; rol/carrera/FK y estados/cupos coherentes. Guardar nombre completo sin división forzada de apellidos: formulario actual no los separa.
- Inspeccionar primero la base local configurada con operaciones de lectura. No ejecutar SQL de limpieza adjunto ni resetear datos. Si hay esquema previo, preparar migración que preserve datos; si algún conflicto de datos impide migrar, informar el conflicto antes de cualquier corrección destructiva.
- Semillas de carreras y roles idempotentes. Datos demo opcionales explícitos para probar controles existentes de acceso demo; no recrear ni sobrescribir usuarios existentes. Cuenta admin configurada localmente y documentada sin guardar contraseña en archivos versionados.

## Cambios mínimos del frontend

- Sustituir simulaciones por llamadas reales en la capa API, con errores tipados y multipart sin Content-Type JSON forzado. Actualizar tipos solo según contrato necesario.
- Ajustar carga de CV y uso del usuario devuelto por servidor para conservar persistencia y URL real. Conectar verificación SMTP eliminando bypass de demostración en modo real. Preservar rutas, filtros, modales y estados de carga/error existentes.
- Agregar indicador de convenio al detalle de convocatoria solicitado por el usuario.
- Corregir avisos compartidos: padding interno aproximado 12px/16px y separación antes/después según layout, evitando sumar margin y gap innecesariamente. Revisar especialmente mensaje de convenio en ficha y botones siguientes.
- Corregir separación superior de sección CTA “Haz que tu talento encuentre el lugar correcto”; .cta-section tiene actualmente padding-top:0. No rediseñar tarjeta ni resto de portada.
- Verificar modales y avisos en móvil, poca altura y zoom. Reparaciones solo de integración/espaciado necesarias, sin reestructurar flujos.

## Pruebas y criterios de aceptación

- Backend: pruebas con base PostgreSQL de pruebas separada (bolsa_practicas_test o URL explícita), nunca borrar datos de la base de usuario. Probar registro, login/logout/expiración, correo, aprobación/rechazo, convenio, borradores/publicación/cierre/reactivación, postulación única, historial y archivos autorizados.
- Casos negativos: manipular rol/convenio/aprobación desde perfil, acceder a convocatorias/candidatos ajenos, CV ajeno, admin consultando CV, empresa pendiente o usuario sin verificar, archivo inválido/excesivo, token inválido/vencido y fechas al límite de Mazatlán.
- Correo estudiantil: probar registro con @uas.edu y @uas.edu.mx, normalización de mayúsculas/espacios exteriores y rechazo de dominios distintos, subdominios y sufijos como @uas.edu.mx.otro.com.
- Pruebas de integración con persistencia real y transporte de correo de prueba. S3 con cliente simulado para verificar comandos/claves/permisos sin credenciales AWS; no afirmar prueba real de S3 sin bucket configurado.
- Frontend: compilación y comprobación TypeScript; pruebas navegador de los tres roles, registro/verificación, aprobación, convenio visible, CV, publicar/postular/cambiar estado/cerrar y persistencia tras recarga. Simular fallos de red/401 para comprobar reintento y sesión vencida.
- Inspección visual de portada, avisos de éxito/error y ficha de revisión en escritorio y móvil; confirmar botones visibles y espaciado. Usar transporte de pruebas para tokens en pruebas automatizadas, nunca bypass de verificación en API normal.
- Documentar comandos, variables, SQL/migraciones, semillas, pruebas, almacenamiento local/S3 y limitaciones de infraestructura no disponible. Reportar por separado lo efectivamente verificado y lo pendiente por servicio externo.

## Decisiones delegadas al implementador

Versiones compatibles de dependencias, validador de entradas, nombres internos y estructura exacta de carpetas, selección de runner de pruebas y detalles CSS conservadores. Documentar cualquier desviación material respecto a este diseño antes de implementarla.
