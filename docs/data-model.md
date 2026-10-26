# Modelo local — semana 8, revisión integrada

## Implementación
- `src/domain/IncidentQueueRecord.ts`: contrato canónico, nueve firmas del puerto, snapshots estructurales sin importar el harness del curso y proyector puro.
- `src/infrastructure/SQLiteIncidentStore.ts`: implementa ese puerto sobre SQLite. Añade guardar/listar snapshots para consulta offline.
- `src/infrastructure/ExpoSqliteAdapter.ts`: adaptador Expo con transacciones serializadas.
- `src/infrastructure/incidentMigrations.ts`: esquema local **3**, migraciones desde 1 y 2, rollback ante excepciones.
- `src/application/createOfflineIncidentActions.ts`: captura por actor, dependencias, autorización y generación estable del ID.
- `src/composition/createCampusOps.ts`: abre de forma diferida `campusops.sqlite`, migra antes de usarlo y conecta sesión, almacenamiento y sincronización.
- `src/ui/OfflineWorkPanel.tsx`: copia local, inicio/nota offline, recuperación de copias/pendientes y sincronización explícita.

## Tablas
| Tabla | Claves y datos |
|---|---|
| schema_meta | key/value; schema_version=3. Distinta de la versión remota y schemaVersion de reportes. |
| incident_snapshots | PK (incident_id, actor_id); version y body_json con snapshot confirmado completo. |
| queue_operations | operation_id único; actor_id, incident_id, sequence, status y record_json con todo el registro. |

El snapshot conserva id, versión, campos de negocio y work compuesto. Notes/evidence conservan arrays completos; historial remoto y metadatos de la cola se mantienen fuera de los campos comparados. El mapper valida antes de descartar información de negocio para la UI.

## Registro
Cada intención conserva operation (ID, incidencia, actor, acción, payload y baseVersion conocida), base, local, sequence, dependsOn, status, preparedRequest, confirmation e issue.
Estados: pendiente, enviando, confirmada, conflicto y bloqueada.
Una confirmada sale del listado activo, pero mantiene su recibo para las dependencias.
No hay API de borrado incondicional ni actualización por ID sin actor.

## Atomicidad e identidad
enqueue guarda el registro completo y su snapshot base en una transacción. La proyección visible deriva de los registros persistidos.
prepareRequest comprueba identidad, contenido, ruta y dependencias confirmadas. Una request existente no puede reemplazarse.
confirm guarda snapshot y recibo juntos; un fallo revierte ambos. No hace retroceder una caché más reciente ni confirma una identidad ajena.
Las operaciones sobre un mismo almacén se serializan; cada consulta de usuario está aislada por actor.
recoverInterrupted conserva la request y devuelve enviando a pendiente, pues el servidor pudo haber aplicado el efecto.

## Migraciones y recuperación
Desde v1 se conserva el contenido original de las operaciones, su identidad y orden. Los snapshots ya existentes se conservan.
El formato v1 no incluía el snapshot original de cada intención: la migración no puede reconstruirlo honestamente. Esas intenciones se conservan en conflicto con issue=contract, pendientes de revisión; no se mandan automáticamente con una base inventada.
Desde v2 se normalizan los registros incompletos producidos por el almacén inicial bajo la misma regla conservadora.
Toda copia, eliminación de tabla antigua y actualización de versión ocurre dentro de la transacción. Se rechaza metadata inválida o una versión futura sin limpiar datos.
Una excepción inyectada tras copiar filas, retirar la tabla antigua o actualizar la versión revierte el esquema y los datos; la prueba cierra y reabre la base antes de reintentar.

## Sesión y uso
La base no guarda tokens. Logout o cambio de generación impide nuevos envíos y nuevas capturas bajo una identidad distinta. La UI se remonta por generación para no mostrar pendientes de la sesión anterior.
Antes de desconectar: abrir una incidencia y pulsar Guardar copia local. Después se puede guardar inicio y nota; al reabrir, seleccionar su copia desde el panel aun si no responde la pantalla remota.
Una nota posterior depende de la intención anterior. La confirmación del inicio permite preparar la nota con la versión realmente recibida.
Una referencia de evidencia no demuestra almacenamiento o subida de una fotografía. La pantalla actual permite notas; no declara captura/carga de imágenes implementada.

## Comprobaciones
- `tests/week8-persistence.test.ts`: cierre/reapertura de archivo SQLite, conservación completa, aislamiento, request inmutable, rollback de confirmación, secuencias concurrentes y dependencia.
- `tests/week8-migrations.test.ts`: datos poblados, snapshots, tres puntos de falla, recuperación, metadata inválida/futura y reparación v2.
- `tests/week8-idempotency.test.ts`: backend vivo, timeout posterior al commit y cola real.
- `tests/week8-offline-ui.test.tsx`: copias recuperadas, captura y error de disco sin falso éxito.

SQLite en Node ejecuta las mismas migraciones y el mismo almacén con un adaptador de prueba. No equivale a una prueba de instalación/reinicio en Android. La validación nativa y los registros individuales finales deben conservarse por separado.
