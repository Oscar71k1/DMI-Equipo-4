# Política de sincronización — semana 8, revisión integrada

## Contrato y capas
El contrato canónico está en src/domain/IncidentQueueRecord.ts. QueueSyncRecord tiene la misma estructura pública de SyncRecord sin dependencia de domain hacia course-evaluation.
Los adaptadores evaluables delegan a incidentSync y deduplicateOperations, usados por el servicio real.
El cliente de sincronización entrega snapshots completos validados. No confundir IncidentMapping (kind=mapped, versión junto al incidente) con un DTO que tenga payload dentro del incidente de dominio.

## Comparación
Se compara base/local/remoto por contenido JSON. Un cambio unilateral se conserva; cambios en campos independientes se combinan; cambios iguales en ambos lados no chocan. Campos incompatibles se devuelven ordenados.
work agrupa estado y técnico: un inicio offline frente a reasignación remota es conflicto.
notes y evidence se comparan como arrays por contenido/orden, sin unión automática por texto.
Los IDs de los tres snapshots deben coincidir. No se modifica ninguna entrada.

## Envío
Se captura actor y generación de sesión. El sincronizador permite una sola ejecución activa y ordena por sequence.
Opera únicamente sobre pendientes elegibles; conflictos/bloqueadas no se reintentan automáticamente.
La deduplicación conserva la primera aparición; la lista de registros también se deduplica, evitando el filtro anterior que volvía a incluir duplicados.
Para una intención sin request, toma la base original o el recibo confirmado de su dependencia. Consulta el estado remoto autorizado y compara tres versiones.
Sólo tras comprobar compatibilidad se prepara y persiste la request sobre la versión remota real. No se cambia un payload ya preparado.
Para una request existente se repite directamente el mismo cuerpo/clave; no se hace una consulta previa que convertiría el propio efecto en un conflicto falso.

## Dependencias e idempotencia
start A offline y comment B quedan persistidos con B dependiendo de A.
Al confirmar A, B puede prepararse usando el snapshot de su recibo y la versión actual compatible del servidor.
Nunca se anticipa la versión sumando uno. Una request congelada mantiene actor, ruta, clave, acción, payload y versión en todo reintento.
El backend didáctico deduplica por actor/ruta/clave y conserva su historial en memoria. No reiniciarlo entre primer envío y replay.
El almacenamiento conserva los recibos confirmados para reconstruir dependencias después de un cierre.

## Respuestas y errores
| Resultado | Conducta |
|---|---|
| 200/201 con identidad, versión y snapshot válidos | Confirmación transaccional individual; duplicate=true también confirma. |
| DTO no disponible, JSON inválido o identidad incorrecta | No confirmar. Conservar para revisión de contrato. |
| Timeout/red/500 | Pendiente con la misma request; detener acciones posteriores de esa incidencia en el lote. |
| 401 | La capa HTTP usa el coordinador de sesión de semana 6 y su refresh acotado. Si persiste el 401, conservar cola y detener lote. |
| 403 | Bloqueada, conservar intención y dependientes; no cambiar a coordinador para forzarla. |
| 409 | Consultar remoto si hay permiso y comparar con base/local reales. Conservar request, campos incompatibles observados y status; no inventar work como conflicto. |
| Dependencia sin confirmar | Mantener pendiente, sin enviar. |
| Logout/cambio de generación durante un await | Detener antes de enviar o confirmar en una sesión distinta; la request sigue recuperable. |

Un 403 después de reasignación puede ocurrir antes del chequeo de versión. El técnico no obtiene datos remotos que ya no puede ver; coordinación verifica la nueva asignación en su contexto.
Un 409 compatible sin campos incompatibles sigue requiriendo revisión: esta versión no cambia automáticamente el cuerpo de una request ya congelada.

## Resolución y límites
El panel informa conflictos/bloqueos y conserva el texto local. No implementa un botón para forzar asignaciones ni para borrar pendientes.
La revisión y resolución por coordinación debe realizarse explícitamente, conservar la intención original y crear una nueva propuesta identificable cuando corresponda. La interfaz de resolución asistida completa no se declara implementada en esta revisión.
La app ofrece copia local, inicio, nota y sincronización manual. add_evidence tiene contrato/proyección, no carga binaria implementada.

## Verificación reproducible
npm test -- --ci --runInBand tests/week8-sync.test.ts tests/week8-action-client.test.ts tests/week8-idempotency.test.ts tests/week8-persistence.test.ts tests/week8-migrations.test.ts tests/week8-offline-ui.test.tsx course-tests/public/week-08.test.ts

La suite de idempotencia inicia un backend real en puerto efímero y usa archivos SQLite temporales. Provoca timeout de 300 ms frente a respuesta retrasada 1500 ms, verifica commit remoto, reabre el archivo y repite el cuerpo original. Comprueba un solo evento remoto y una sola nota.
También verifica reasignación/403 con intención intacta, modificación remota independiente, 500, confirmación incorrecta, conflicto de notes, logout y single-flight.
Los tests de UI usan dobles de aplicación; no sustituyen la ejecución en Android. Consultar el informe de revisión para los resultados observados.
