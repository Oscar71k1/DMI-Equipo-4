import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateIncidentStore, type MigrationStep } from '../src/infrastructure/incidentMigrations';

function openTestDb(file: string) {
  const raw = new DatabaseSync(file);
  return {
    raw,
    exec: async (sql: string) => { raw.exec(sql); },
    run: async (sql: string, params: readonly unknown[] = []) => { raw.prepare(sql).run(...(params as (string | number | null)[])); },
    all: async <R>(sql: string, params: readonly unknown[] = []) => raw.prepare(sql).all(...(params as (string | number | null)[])).map((r) => ({ ...r })) as R[],
    transaction: async <T>(work: () => Promise<T>): Promise<T> => {
      raw.exec('BEGIN');
      try {
        const res = await work();
        raw.exec('COMMIT');
        return res;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => raw.close(),
  };
}

describe('Week 8 - Migraciones de Esquema', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'w8-migr-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('Migracion valida incrementa la version a 2', async () => {
    const dbPath = join(tempDir, 'valid.sqlite');
    const db = openTestDb(dbPath);
    const res = await migrateIncidentStore(db);
    expect(res.to).toBe(2);
    db.close();
  });

  test('Falla inyectada hace rollback y mantiene el esquema en version 1', async () => {
    const dbPath = join(tempDir, 'fail.sqlite');
    const db = openTestDb(dbPath);

    db.raw.exec(`
      CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO schema_meta VALUES ('schema_version', '1');
      CREATE TABLE operations (operation_id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, payload TEXT NOT NULL, base_version INTEGER NOT NULL);
    `);

    await expect(
      migrateIncidentStore(db, {
        afterStep: (step: MigrationStep) => {
          if (step === 'schema-created') throw new Error('Falla de prueba');
        },
      })
    ).rejects.toThrow('Falla de prueba');

    const meta = db.raw.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get() as { value: string };
    expect(meta.value).toBe('1');
    db.close();
  });
});