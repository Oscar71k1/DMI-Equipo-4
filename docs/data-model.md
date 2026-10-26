# Modelo de Datos y Persistencia Local — Semana 8

## 1. Alcance y Rutas
- `src/infrastructure/SqlDatabase.ts`: Interfaz del puerto mínimo de base de datos.
- `src/infrastructure/ExpoSqliteAdapter.ts`: Adaptador nativo para la app Expo.
- `src/infrastructure/SQLiteIncidentStore.ts`: Almacén transaccional de operaciones pendientes.
- `src/infrastructure/incidentMigrations.ts`: Gestor de migraciones de esquema (V1 -> V2).

## 2. Entidades y Esquema (SQLite)
### `schema_meta`
- `key` (TEXT, PRIMARY KEY): Identificador de metadato.
- `value` (TEXT): Valor del metadato (ej. `schema_version` = 2).

### `queue_operations`
- `operation_id` (TEXT, PRIMARY KEY): ID estable de la operación.
- `actor_id` (TEXT, NOT NULL): ID del técnico/usuario que creó la intencion.
- `incident_id` (TEXT, NOT NULL): Incidencia asociada.
- `sequence` (INTEGER, NOT NULL): Orden de ejecución local por actor.
- `status` (TEXT, NOT NULL): Estado local (`pendiente`, `sincronizando`, `confirmado`, `conflicto`).
- `record_json` (TEXT, NOT NULL): Payload de la intencion e historial.

## 3. Invariantes Transaccionales
1. **Aislamiento por Actor:** Cada consulta o lectura de la cola filtra estrictamente por `actor_id`.
2. **Atomicidad de Guardado:** La inserción de la intención en cola ocurre dentro de una transacción implícita/explícita en disco.
3. **Rollback en Migraciones:** Si un paso de la migración falla, el rollback revierte los cambios DDL/DML, preservando los datos de la versión previa.