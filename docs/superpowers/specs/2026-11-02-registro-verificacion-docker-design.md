# Registro, verificación y Docker

Diseño aprobado por el usuario en conversación el 2026-11-02. Este documento
registra la propuesta aprobada; las decisiones de implementación se señalan como
tales. Referencia: P10_LosIngenieritos_29oct2026.pdf, páginas 2-8 y 12.

## Objetivo

Impedir registros con teléfono, matrícula o RFC mal formados, mostrar el resultado
correcto al verificar el correo y entregar una instalación reproducible con Docker.
Mantener los flujos de estudiantes, empresas y administración y conservar los datos.

## Reglas acordadas

- Teléfono: exactamente 10 dígitos ASCII si se proporciona. Sin espacios internos,
  guiones ni prefijo internacional. Conserva su carácter opcional actual.
- Matrícula: de 1 a 20 dígitos ASCII. Se almacena como texto para conservar ceros
  iniciales. El ejemplo 22141502 no fija una longitud obligatoria de ocho dígitos.
- RFC: persona física de 13 posiciones y persona moral de 12; bloque inicial de
  cuatro o tres caracteres, seis dígitos AAMMDD con fecha válida y tres caracteres
  alfanuméricos finales. Mantener Ñ y & admitidos por la expresión existente;
  normalizar espacios exteriores y mayúsculas. No consultar el padrón del SAT.
- Validar al registrar y al editar estos mismos datos, tanto en UI como en API.
- Primera verificación: mensaje de éxito. Reabrir enlace usado: ya verificado.
  Conservar caducidad, uso único y protección de la identidad de sesiones ajenas.

## Arquitectura y enfoques

1. **Elegido: Compose con frontend, backend y PostgreSQL persistente.** Reproduce
   la instalación completa; requiere administrar respaldos del volumen de BD.
2. Compose con frontend/backend y PostgreSQL externo: apropiado si existe una BD
   administrada, pero añade un requisito externo para ejecutar la entrega.

Se conservan React 19, Vite, Express y Prisma 6.19. Las funciones de validación
se agruparán por responsabilidad; no se reorganizará la aplicación completa.

## Verificación de correo

La pantalla dispara una operación de uso único desde un efecto. StrictMode vuelve
a ejecutar ese efecto y puede hacer que la respuesta visible sea la segunda.
Se reproducirá con una prueba que exija el mensaje exacto de primera verificación
y se evitará duplicar la operación durante el mismo montaje. Una visita posterior
debe consultar otra vez al servidor. Un error de red debe permitir reintentar;
no se conservarán resultados de tokens indefinidamente ni se cambiará el contrato
del backend para esconder solicitudes duplicadas.

## Contenedores

- Backend: Node 22 Alpine, npm ci y cliente Prisma generado dentro de la imagen.
  Puerto 3000 en Docker; host configurable, 0.0.0.0 en contenedor.
- Frontend: build con Node 22 Alpine, imagen final Nginx Alpine, puerto externo
  8080 hacia 80. Proxy /api al backend y fallback index.html para rutas React.
- PostgreSQL: versión fijada durante implementación, volumen persistente.
- Volumen separado para archivos privados; comprobaciones de salud y ejecución
  de migraciones previa a iniciar la API. Las migraciones fallidas impiden arrancar.
- Mantener DATABASE_URL. Documentar que DB_* y JWT_EXPIRES_IN del informe no son
  variables implementadas por la aplicación. La sesión conserva ocho horas.
- Credenciales externas a la imagen; ejemplos sin secretos y exclusiones Docker.
- Cookies configuradas explícitamente para HTTP local y HTTPS de producción;
  producción conserva Secure por defecto. No activar mocks en el build entregado.
- Considerar fixtures compartidas fuera de frontend/ y la dependencia backend
  file:.. al definir contexto de build; no copiar literalmente ejemplos del PDF.
- Multietapa en backend si permite mantener cliente Prisma y herramienta de
  migración funcionales sin incluir herramientas de prueba en el runtime.

## Base de datos y SQL

El SQL existente es una instalación completa para una BD nueva, no una migración.
Revisar esquema Prisma, historial y generador; regenerar el SQL si cambia el
manifiesto demo. Corregir semillas nuevas incompatibles con las reglas.

No hace falta cambiar columnas solo para validar formatos en API. Si durante la
implementación se identifica un cambio de esquema necesario, añadir una migración
que conserve datos. No corregir registros históricos inventando matrículas/RFC.
No importar el SQL en una BD existente ni aplicar cambios a la BD real sin revisar
destino y respaldo. Usar exclusivamente la BD de pruebas para tests de integración.

## Verificación y entrega

Pruebas de formato válido/inválido, límites, opcionales, ceros iniciales y fechas
imposibles; regresión de primera verificación y enlace reutilizado. Ejecutar suite
backend, E2E pertinentes, typecheck, build y formato. Validar Compose y construir/
arrancar contenedores si Docker está disponible; declarar verificaciones bloqueadas.

Entregar relación de archivos cambiados, explicación de sus cambios y comandos
para instalación nueva, migración con respaldo y persistencia de datos/archivos.

## Fuera de alcance

Publicar en ECR, desplegar AWS, configurar DNS/TLS o migrar archivos a S3. El PDF
describe acciones de una práctica y no autoriza ejecutarlas en cuentas externas.
