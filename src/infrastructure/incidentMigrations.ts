import type { SqlDatabase } from './SqlDatabase';

export const LATEST_SCHEMA_VERSION = 2;

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

const QUEUE_TABLE_SQL = `CREATE TABLE queue_operations (
  operation_id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL,
  record_json TEXT NOT NULL
)`;

const SNAPSHOT_TABLE_SQL = `CREATE TABLE incident_snapshots (
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
  return first ? Number(first.value) : 0;
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
      status: 'pendiente',
      preparedRequest: null,
      confirmation: null,
      issue: null,
    };
    await db.run(
      'INSERT INTO queue_operations (operation_id, actor_id, incident_id, sequence, status, record_json) VALUES (?, ?, ?, ?, ?, ?)',
      [row.operation_id, row.actor_id, row.incident_id, sequence, 'pendiente', JSON.stringify(record)],
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

    await db.run(
      "INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(LATEST_SCHEMA_VERSION)],
    );
    step('version-updated');
  });

  return { from, to: LATEST_SCHEMA_VERSION };
}