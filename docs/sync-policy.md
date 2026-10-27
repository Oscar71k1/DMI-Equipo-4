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
La resolución explícita está en el panel: Revisar conflicto → Aceptar estado del servidor. Antes de confirmar se explica que también afecta las notas dependientes. Cancelar mantiene todo pendiente.
El actor propietario consulta de nuevo el servidor con su sesión. Si conserva permisos, se guarda el snapshot autorizado; ante 403 no se expone la nueva asignación y se retira únicamente la caché obsoleta. Coordinación consulta el estado vigente en su propia sesión; no se suplantan perfiles para recuperar datos.
acceptRemote guarda una decisión keep_remote con actor, fecha, operación raíz y snapshot autorizado (o null ante 403), junto con sus dependientes, en una transacción. Conserva íntegramente operation/base/local/request/status/issue; no inventa confirmaciones y no borra operaciones. Los registros siguen consultables como historial local y el sincronizador ya no los reenvía.
Si una petición fue preparada, sólo se acepta el cierre tras un rechazo inequívoco 403/409. Un timeout o una confirmación malformada no permiten suponer que no hubo efecto: se conserva la petición original para reconciliarla. Un fallo de almacenamiento revierte la decisión para toda la cadena.
Para trabajo nuevo se exige una copia actualizada accesible con el perfil vigente; se crea otra identidad sin reutilizar el cuerpo anterior. No existe resolución automática que imponga la asignación antigua ni transferencia automática de notas a otro actor.
La app ofrece copia local, inicio, nota y sincronización manual. add_evidence tiene contrato/proyección, no carga binaria implementada.

## Verificación reproducible
npm test -- --ci --runInBand tests/week8-sync.test.ts tests/week8-action-client.test.ts tests/week8-idempotency.test.ts tests/week8-persistence.test.ts tests/week8-migrations.test.ts tests/week8-offline-ui.test.tsx course-tests/public/week-08.test.ts

La suite de idempotencia inicia un backend real en puerto efímero y usa archivos SQLite temporales. Provoca timeout de 300 ms frente a respuesta retrasada 1500 ms, verifica commit remoto, reabre el archivo y repite el cuerpo original. Comprueba un solo evento remoto y una sola nota.
También verifica reasignación/403 con intención intacta, modificación remota independiente, 500, confirmación incorrecta, conflicto de notes, logout, single-flight, aceptación explícita del estado remoto con conservación de intención, rollback de resolución y rechazo de confirmaciones inciertas.
Los tests de UI usan dobles de aplicación; no sustituyen la ejecución en Android. Consultar el informe de revisión para los resultados observados.

## Prueba nativa en Android

Ejecutada en un Samsung SM-G981V con Android 13. El reinicio sin conexión conservó los dos IDs y la nota; la reasignación produjo un bloqueo y la resolución preservó ambas intenciones como historial. La evidencia y sus límites están en `reports/week-08/native-validation.json`. El segundo cierre posterior a resolver no se ejecutó porque la revisión automática de permisos lo bloqueó.

El procedimiento reproducible de instalación está en `docs/android-local-validation.md`; los siguientes pasos describen el caso y no sustituyen los resultados observados.

1. Usar una instalación Android que incluya expo-sqlite (`npm run android`) y el backend didáctico. Configurar EXPO_PUBLIC_COURSE_BACKEND_URL con una dirección accesible desde el dispositivo; con USB, `adb reverse tcp:4310 tcp:4310` permite usar `http://127.0.0.1:4310`.
2. Iniciar sesión con technician-1 y abrir campus-inc-001 mientras todavía está asignada a ese actor. Pulsar Guardar copia local. Cortar la conexión al backend y guardar inicio y nota; anotar los dos IDs que muestra el panel y el texto.
3. Ejecutar `adb shell am force-stop mx.edu.dmi.engineeringapp` y reabrir la app desde su icono, todavía sin conexión. Registrar los mismos IDs, base/estado local y texto. Un relanzamiento que requiera Metro o reautenticación no demuestra por sí solo este caso: registrar el resultado real y el límite observado.
4. En otra sesión autorizada como coordinator-1, reasignar esa misma incidencia a technician-2. Volver al técnico original, restablecer conexión y pulsar Sincronizar pendientes. Esperar bloqueo/conflicto y conservación de inicio/nota, sin alterar la reasignación.
5. Revisar el caso con coordinación. Pulsar Revisar conflicto, leer el alcance y confirmar Aceptar estado del servidor. Verificar que ambas intenciones quedan como historial, con sus mismos IDs y contenido. Cerrar y reabrir otra vez; Sincronizar pendientes no debe aplicar el inicio ni la nota retenidos.
6. Guardar pasos, hora, build/SHA, actor ficticio, IDs, resultados y logs sin tokens. Sustituir el check pendiente en migration-tests.json sólo después de observar estos resultados. La carga de fotos no es necesaria para este caso porque se usa una nota.

Para reproducir los reportes automáticos: Node 22.22.0 en PATH y `python -B tools/generate_week08_reports.py`. El script por sí solo conserva la prueba nativa como pendiente; no la infiere de los tests de Node. Después de ejecutarlo, incorporar el resultado observado y sus limitaciones desde `reports/week-08/native-validation.json`; no convertirlo en aprobado sin comprobar esa evidencia.
