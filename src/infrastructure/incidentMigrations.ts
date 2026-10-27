import type { SqlDatabase } from './SqlDatabase';

export const LATEST_SCHEMA_VERSION = 3;

export type MigrationStep =
  | 'schema-created'
  | 'rows-copied'
  | 'legacy-dropped'
  | 'version-updated';

export type MigrationOptions = Readonly<{
  afterStep?: (step: MigrationStep) => void;
}>;

export type MigrationResult = Readonly<{ from: number; to: number }>;

type LegacyRow = {
  operation_id: string;
  incident_id: string;
  actor_id: string;
  action: string;
  payload: string;
  base_version: number;
};

const QUEUE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS queue_operations (
  operation_id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL,
  record_json TEXT NOT NULL
)`;

const SNAPSHOT_TABLE_SQL = `CREATE TABLE IF NOT EXISTS incident_snapshots (
  incident_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  body_json TEXT NOT NULL,
  PRIMARY KEY (incident_id, actor_id)
)`;

async function readSchemaVersion(db: SqlDatabase): Promise<number> {
  const tables = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_meta'",
  );
  if (tables.length === 0) return 0;
  const rows = await db.all<{ value: string }>(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'",
  );
  const first = rows[0];
  const version = first ? Number(first.value) : NaN;
  if (!Number.isInteger(version) || version < 0) throw new Error('Version de esquema invalida');
  return version;
}

async function copyLegacyOperations(db: SqlDatabase): Promise<void> {
  const rows = await db.all<LegacyRow>(
    'SELECT operation_id, incident_id, actor_id, action, payload, base_version FROM operations ORDER BY rowid',
  );
  let sequence = 0;
  for (const row of rows) {
    sequence += 1;
    const base = { id: row.incident_id, version: row.base_version, fields: {} };
    const record = {
      operation: {
        operationId: row.operation_id,
        incidentId: row.incident_id,
        baseVersion: row.base_version,
        actorId: row.actor_id,
        action: row.action,
        payload: JSON.parse(row.payload) as unknown,
      },
      base,
      local: base,
      sequence,
      dependsOn: [] as string[],
      // Legacy data does not include its original snapshot. Preserve the intent
      // but require review instead of fabricating a base and automatically sending.
      status: 'conflicto',
      preparedRequest: null,
      confirmation: null,
      issue: { kind: 'contract' },
    };
    await db.run(
      'INSERT INTO queue_operations (operation_id, actor_id, incident_id, sequence, status, record_json) VALUES (?, ?, ?, ?, ?, ?)',
      [row.operation_id, row.actor_id, row.incident_id, sequence, 'conflicto', JSON.stringify(record)],
    );
  }
}

export async function migrateIncidentStore(
  db: SqlDatabase,
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const from = await readSchemaVersion(db);
  if (from > LATEST_SCHEMA_VERSION) {
    throw new Error('El esquema local es mas nuevo que el soportado');
  }
  if (from === LATEST_SCHEMA_VERSION) return { from, to: from };

  const step = options.afterStep ?? (() => undefined);

  await db.transaction(async () => {
    await db.exec('CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    await db.exec(QUEUE_TABLE_SQL);
    await db.exec(SNAPSHOT_TABLE_SQL);
    step('schema-created');

    if (from === 1) {
      await copyLegacyOperations(db);
      step('rows-copied');
      await db.exec('DROP TABLE operations');
      step('legacy-dropped');
    }

    if (from === 2) {
      const rows = await db.all<{ record_json: string }>('SELECT record_json FROM queue_operations ORDER BY sequence');
      for (const row of rows) {
        const record = JSON.parse(row.record_json);
        if (!record.operation || !record.operation.operationId) throw new Error('Registro de cola invalido');
        if (!record.base || !record.local || !Array.isArray(record.dependsOn)) {
          const base = { id: record.operation.incidentId, version: record.operation.baseVersion, fields: {} };
          Object.assign(record, { base, local: base, dependsOn: [], status: 'conflicto',
            preparedRequest: null, confirmation: null, issue: { kind: 'contract' } });
        }
        await db.run('UPDATE queue_operations SET status = ?, record_json = ? WHERE operation_id = ?',
          [record.status, JSON.stringify(record), record.operation.operationId]);
      }
      step('rows-copied');
    }

    await db.run(
      "INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(LATEST_SCHEMA_VERSION)],
    );
    step('version-updated');
  });

  return { from, to: LATEST_SCHEMA_VERSION };
}
