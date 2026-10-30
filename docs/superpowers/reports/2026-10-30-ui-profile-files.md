# Ajustes de interfaz, perfiles y archivos

- El resumen del estudiante comprueba teléfono, acerca de ti, matrícula, carrera y CV. El porcentaje y la barra reflejan los cinco apartados; los espacios vacíos no cuentan como información completada.
- La información del convenio aparece únicamente en el recuadro de postulación, después del aviso de privacidad y un separador. Se muestra un check para convenio vigente o una advertencia con el proceso que el estudiante debe comunicar a la empresa, incluyendo los casos vencido y futuro. Se conservan las fechas y el cálculo local de vigencia.
- Se retiró el mensaje sobre America/Mazatlan bajo la fecha de cierre del formulario empresarial; la regla de fecha límite no cambió.
- Empresas permite combinar búsqueda, estado de solicitud y estado de convenio. Limpiar filtros restablece los tres campos. Encabezados y celdas comparten anchos para evitar el desfase de Acciones.
- Explorar convocatorias del estudiante filtra por las carreras solicitadas, conservando la búsqueda por título o empresa.
- Avatares y logotipos se propagan a menús, tarjetas, detalles, candidatos e historial. Se conservan las iniciales si no hay imagen o falla la carga; una nueva imagen puede cargarse después de ese fallo.
- Los archivos usan la API protegida con el driver guardado para cada archivo. Se verificó almacenamiento local y el adaptador S3 con un cliente simulado; no se configuró ni comprobó un bucket real.
- Por decisión expresa del usuario, las empresas descargan siempre el CV actual, también en postulaciones anteriores. Un enlace estable resuelve el archivo al descargarlo, incluso si el listado ya estaba abierto. Se mantienen los permisos por empresa aprobada y postulación, y las respuestas PDF admiten Range. No se alteraron los registros históricos ni se migraron archivos del usuario.
- Se admiten exactamente `@uas.edu`, `@uas.edu.mx` y `@ms.uas.edu.mx`; registro y Cómo funciona muestran los tres dominios. Se conserva la verificación de propiedad del correo.

## Verificación

- Backend: 61/61 pruebas aprobadas.
- Navegador: 42/42 escenarios aprobados, incluyendo reemplazo de CV y descarga sin recargar el listado, los tres dominios, imágenes, filtros y vistas responsive.
- TypeScript, build y Prettier correctos.
- Se verificó mediante consultas de solo lectura que la postulación real indicada de Mariana utiliza los metadatos de su CV actual; no se leyó su documento.
- En el servidor E2E aislado se distingue la dirección de los clientes a través del proxy local para evitar acumular todos los intentos en una sola IP. El límite y la configuración de seguridad de la API normal permanecen intactos.

La API local se recargó para aplicar los cambios. No se realizó merge ni push.
