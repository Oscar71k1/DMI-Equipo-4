# Política de Sincronización, Idempotencia y Resolución de Conflictos — Semana 8

**Responsable:** María Fernanda Fuentes Abascal
**Fecha:** 25 de octubre de 2026  
**Alcance:** Protocolo de sincronización offline-first, resolución de 3 versiones, deduplicación e idempotencia de acciones en CampusOps.

---

## 1. Alcance, rutas del servicio y relación con el almacenamiento

El subsistema de sincronización conecta las intenciones locales capturadas offline con el backend remoto a través del puerto durable provisto por SQLite (`IncidentQueuePort`).

- **Módulos clave:**
  - `src/domain/incidentSync.ts`: Motor puro de comparación estructural de 3 versiones (`resolveSync`) y detección de conflictos.
  - `src/domain/deduplicateOperations.ts`: Deduplicación estable y sin mutación de arreglos de operaciones pendientes.
  - `src/domain/IncidentQueueRecord.ts`: Contrato de colas, tipos de estados, proyecciones puras (`projectOperation`) e interfaz del puerto.
  - `src/application/createIncidentSyncService.ts`: Orquestador de sincronización, serialización de envíos y manejo de respuestas.
- **Relación con la cola:** El servicio jamás mantiene listas en memoria volátiles. Toda operación se lee de disco, se marca en estado `enviando` antes de abrir el socket de red, y solo se retira atómicamente cuando el backend devuelve un sobre válido con su identidad confirmada.

---

## 2. Representación base/local/remoto y conservación de versiones

Cada registro en cola gestiona tres representaciones de datos tipadas (`SyncRecord`):
- `base`: Último snapshot confirmado por el servidor conocido al momento de la captura offline.
- `local`: Resultado de proyectar la intención del técnico sobre la base (`projectOperation`).
- `remote`: Snapshot remoto actual autorizado obtenido del servidor.

**Conservación de versión:** `baseVersion` en `PreparedRequest` refleja exactamente la versión numérica confirmada por el servidor (`base.version`). Nunca se proyecta un incremento preventivo (`version + 1`) en la solicitud HTTP; el servidor es la única autoridad de secuencia.

---

## 3. Reglas de combinación, igualdad JSON, campo compuesto `work` y conflictos

La función `resolveSync(base, local, remote)` evalúa campo por campo:

| Cambio Local vs Base | Cambio Remoto vs Base | Decisión |
|---|---|---|
| No | No | Conservar `base`. |
| Sí | No | Conservar `local`. |
| No | Sí | Conservar `remote`. |
| Sí | Sí (igual contenido estructural) | Conservar contenido común, sin conflicto. |
| Sí | Sí (distinto contenido) | Registrar campo en conflicto. |

- **Igualdad Estructural (`deepEqual`):** Los objetos JSON son evaluados independientemente del orden de inserción de sus claves. Los arreglos (`notes`, `evidence`) son estrictos en longitud y posición.
- **Campo Compuesto `work`:** `work` `{ assignedTechnicianId, status }` es indivisible. Si local transiciona el estado a `in_progress` pero el servidor reasignó a otro técnico (`technician-2`), la comparación evalúa el objeto `work` completo y declara `{ kind: 'conflict', fields: ['work'] }`. No se combinan recursivamente propiedades internas.
- **Orden de Conflictos:** Cuando surgen múltiples campos incompatibles, la lista `fields` se entrega ordenada alfabéticamente.

---

## 4. Identidad de operación y cuerpo inmutable en reintentos

- Toda acción se identifica por un `operationId` único generado al capturarse offline.
- Al prepararse la solicitud (`prepareRequest`), se congela el objeto `PreparedRequest` persistido con su encabezado `Idempotency-Key: operationId` y su cuerpo JSON.
- **Inmutabilidad:** Ante interrupciones de red o timeouts, el cliente reintenta **exactamente el mismo cuerpo y clave**, sin alterar `baseVersion`. El servidor valida la clave persistida en su histórico; si la operación ya se aplicó, responde con `duplicate: true`, permitiendo confirmar la acción sin duplicar efectos en la base de datos.

---

## 5. Orden y dependencias entre operaciones

1. Las operaciones de una misma incidencia se procesan secuencialmente.
2. Si una operación `B` (ej. `comment`) depende de una operación `A` (ej. `start`):
   - `B.dependsOn = [A.operationId]`.
   - Si `A` no ha alcanzado el estado `confirmada`, `B` se suspende con `issue.kind = 'dependency'` y no se envía.
   - Una vez confirmada `A`, `B` adopta el snapshot confirmado de `A` como su base efectiva antes de preparar su envío.

---

## 6. Tratamiento de códigos HTTP y errores

- **200 / 201 (Confirmación válida):** Se valida que `response.operationId === request.idempotencyKey`. Se persiste la confirmación y se retira de pendientes. `duplicate: true` se trata como confirmación exitosa.
- **Timeout / Error de Red / 500:** La operación se mantiene en disco con estado `pendiente` e `issue.kind = 'network'`. Al reiniciar la app, `recoverInterrupted()` devuelve operaciones `enviando` a `pendiente` para habilitar el reintento.
- **401 Unauthorized:** Se invoca la renovación coordinada de sesión (`onRefreshSession`). Si la renovación falla, se detiene el lote sin borrar la cola.
- **403 Forbidden:** La operación se marca como `bloqueada` (`issue.kind = 'forbidden'`). La intención no se elimina; queda retenida para revisión administrativa.
- **409 Conflict:**
  - *Por versión/transición:* Se marca como `conflicto` con los campos afectados.
  - *Por clave reutilizada:* Indica inconsistencia del cliente; se preserva para auditoría sin regenerar IDs a ciegas.

---

## 7. Condiciones de retiro de la cola

Una operación **únicamente** se retira de la lista activa de pendientes si:
1. El servidor respondió con status 200/201.
2. El sobre contiene `operationId` idéntico al enviado.
3. El DTO de la incidencia es válido y consistente.
4. La transacción local en SQLite guardó el recibo y actualizó la caché de la incidencia.

Bajo ninguna circunstancia se retira una operación dentro de un bloque `finally` o por límite de reintentos agotado.

---

## 8. Flujo de resolución por actor autorizado

Cuando una operación entra en conflicto (ej. técnico reasignado), el técnico anterior no puede sobreescribir los datos remotos. La intención se preserva localmente. La resolución requiere que coordinación (o el actor autorizado) revise la incidencia, decida la integración de las notas/diagnóstico pendientes y aplique la transición correspondiente.

---

## 9. Recuperación tras cierre y límites de idempotencia

Al reiniciar la aplicación:
- `recoverInterrupted()` escanea la cola y restaura cualquier registro `enviando` a `pendiente`.
- Los registros conservan su `preparedRequest` intacta; el próximo ciclo de sincronización reenvía la solicitud original sin generar un nuevo ID.
- *Nota del entorno didáctico:* El backend de laboratorio almacena el historial de idempotencia en memoria. Reiniciar el proceso del backend borra ese historial; por tanto, las pruebas de idempotencia deben ejecutarse contra una misma instancia activa del servidor.

---

## 10. Matriz de Requisitos vs Comprobaciones y Evidencias

| Requisito | Escenario | Prueba / Comando | Resultado Esperado |
|---|---|---|---|
| AC-01 / W8-C02 | 3-way merge | `npm test -- tests/week8-sync.test.ts` | Conserva cambios independientes sin mutación. |
| AC-01 / W8-C01 | Conflicto compuesto | `npm test -- tests/week8-sync.test.ts` | Conflicto en `work` ante reasignación. |
| AC-02 / W8-D01 | Deduplicación | `npm test -- course-tests/public/week-08.test.ts` | Primera aparición conservada en orden relativo. |
| AC-03 / W8-I01 | Respuesta perdida | `npm test -- tests/week8-idempotency.test.ts` | Reintento confirmado con `duplicate: true`. |
| AC-03 / W8-I02 | Falla de red | `npm test -- tests/week8-idempotency.test.ts` | Operación conservada en disco tras error 500. |
| AC-03 / Dependencias | Orden de cola | `npm test -- tests/week8-idempotency.test.ts` | `comment` espera confirmación de `start`. |