# Definición del problema — CampusOps

Esta definición describe el comportamiento objetivo del proyecto acumulativo. En la semana 1 se documentan el caso y sus límites y se comprueba el starter; los criterios de negocio todavía no se consideran implementados.

## Problema

En un campus ficticio se necesita dar seguimiento a fallas eléctricas, fugas de agua, daños en laboratorios, problemas de conectividad y equipos descompuestos. Si un reporte no conserva su ubicación, responsable, estado e historial en un mismo registro, el reportante no puede saber qué ocurrió y coordinación no puede distinguir un caso pendiente de uno realmente atendido.

CampusOps centralizará ese seguimiento con cuentas, fotografías y ubicaciones sintéticas. Permitirá identificar quién reportó, a qué técnico se asignó la incidencia, qué atención recibió y quién autorizó su cierre. En zonas sin cobertura deberá conservar el trabajo pendiente sin sobrescribir una reasignación realizada por coordinación.

## Alcance

### Incluye

- Una aplicación Android con funciones para reportante, técnico y coordinador, desarrollada progresivamente con React Native, Expo y TypeScript.
- Crear, listar y consultar incidencias con categoría, descripción y ubicación; incorporar fotografías de prueba y notas con permisos según el perfil.
- Priorizar, asignar y reasignar incidencias; registrar diagnóstico, resolución, cierre, reapertura e historial de cambios.
- Consultar datos almacenados y conservar cambios pendientes sin conexión; sincronizar con detección de conflictos y reintentos que no dupliquen operaciones confirmadas.
- Incorporar mapas o geocodificación en el hito correspondiente y permitir escribir la ubicación manualmente si el servicio o el permiso no están disponibles.
- En esta semana: definir el problema y tres riesgos, comprobar la línea base y conservar evidencia de una falla controlada y su corrección.

### No incluye

- Operación institucional real, datos personales reales y atención de emergencias.
- Pagos, chat en tiempo real, reconocimiento de imágenes con IA y panel web administrativo completo.
- Seguimiento continuo de ubicación, mapas offline completos y publicación obligatoria en tiendas. iOS y notificaciones push no forman parte del mínimo.
- Implementar durante la semana 1 el inicio de sesión, la sincronización, todas las pantallas o la aplicación completa.

## Actores y responsabilidades

- **Reportante:** crear incidencias con información suficiente para ubicarlas, consultar sus propios reportes y aportar notas o fotografías de prueba cuando sea necesario.
- **Técnico:** consultar sus asignaciones, iniciar atención, registrar diagnóstico y evidencias y marcar la resolución. Puede trabajar con información local sin conexión; no modifica una incidencia que ya fue reasignada a otra persona ni autoriza el cierre definitivo.
- **Coordinador:** revisar el conjunto de incidencias, establecer prioridad, asignar o reasignar técnicos, revisar historial y evidencias y decidir el cierre o la reapertura. La autorización debe comprobarse en el servicio además de reflejarse en la interfaz.

## Flujo principal

1. Reportar: el reportante registra categoría, descripción y ubicación con datos sintéticos. La incidencia queda en `open` y recibe un identificador para su seguimiento.
2. Asignar: coordinación revisa el reporte, establece su prioridad y asigna un técnico. El estado cambia a `assigned` y se conserva el evento en el historial.
3. Atender: el técnico asignado pasa el caso a `in_progress`, añade diagnóstico y evidencias y lo marca `resolved` cuando termina. Un cambio sin conexión se conserva pendiente; al sincronizar se comprueba que la asignación siga vigente.
4. Cerrar: coordinación revisa la resolución y cambia a `closed`. Si hace falta más atención, puede reabrir un caso resuelto o cerrado hacia `assigned` cuando exista un técnico asignado. La resolución y el cierre generan eventos distintos.

## Criterios de aceptación verificables

1. Dado un reportante y un reporte con categoría, descripción y ubicación, cuando se confirma su creación, entonces se puede consultar por su identificador con esos datos y estado `open`.
2. Dada una incidencia abierta, cuando coordinación asigna un técnico, entonces el detalle muestra ese responsable, estado `assigned` y un evento de asignación en el historial.
3. Dada una incidencia asignada, cuando su técnico registra atención y resolución, entonces el flujo avanza por `in_progress` y `resolved`; sólo una operación autorizada de coordinación la cambia a `closed`. Un intento del técnico de cerrarla se rechaza sin alterar el estado.
4. Dada una incidencia resuelta o cerrada con técnico asignado, cuando coordinación la reabre, entonces vuelve a `assigned` y conserva los eventos anteriores junto con la reapertura.
5. Dado un cambio guardado sin conexión, cuando se cierra y reinicia la app, entonces el cambio y sus adjuntos pendientes siguen disponibles; no se muestran como confirmados hasta recibir confirmación del servicio.
6. Dado que un técnico inicia atención sin conexión y coordinación reasigna el caso a otro técnico, cuando se sincroniza, entonces se informa el conflicto, se conserva la intención pendiente y no se sobrescribe la nueva asignación.
7. Dada una operación cuya respuesta se perdió, cuando se reintenta con la misma clave y contenido, entonces existe un solo evento confirmado. Reutilizar esa clave con otro contenido se rechaza.
8. Dado que falla la geocodificación o se deniega el permiso de ubicación, cuando el reportante captura edificio, zona y referencia manualmente, entonces puede continuar con el reporte.
9. Para la línea base de la semana 1: dado el doble de backend exitoso de la prueba existente, cuando se renderiza `App`, entonces aparecen `CampusOps` y `Backend: available`. Se comprueba con `npm run test:smoke`; esta comprobación no acredita los flujos de negocio anteriores ni una conexión a un servidor real.
