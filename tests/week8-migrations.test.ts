import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateIncidentStore, LATEST_SCHEMA_VERSION } from '../src/infrastructure/incidentMigrations';
import { SQLiteIncidentStore } from '../src/infrastructure/SQLiteIncidentStore';
import { base, openDb } from './helpers/week8';

describe('Week 8: populated migration and rollback on real SQLite', () => {
  let dir: string;
  let db: ReturnType<typeof openDb>;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campus-migration-'));
    db = openDb(join(dir, 'data.sqlite'));
    db.raw.exec(`
      CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO schema_meta VALUES ('schema_version', '1');
      CREATE TABLE operations (operation_id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, actor_id TEXT NOT NULL,
        action TEXT NOT NULL, payload TEXT NOT NULL, base_version INTEGER NOT NULL);
      INSERT INTO operations VALUES ('old-note-001', 'campus-inc-001', 'technician-1', 'comment', '{"text":"nota antigua"}', 1);
      CREATE TABLE incident_snapshots (incident_id TEXT, actor_id TEXT, version INTEGER, body_json TEXT,
        PRIMARY KEY(incident_id, actor_id));
    `);
    db.raw.prepare('INSERT INTO incident_snapshots VALUES (?, ?, ?, ?)').run(base.id, 'technician-1', 1, JSON.stringify(base));
  });
  afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  test('preserves incident snapshot, ID and note; absent original base is quarantined, not fabricated for sending', async () => {
    expect((await migrateIncidentStore(db)).to).toBe(LATEST_SCHEMA_VERSION);
    db.close(); db = openDb(join(dir, 'data.sqlite'));
    expect(await migrateIncidentStore(db)).toEqual({ from: LATEST_SCHEMA_VERSION, to: LATEST_SCHEMA_VERSION });
    const store = new SQLiteIncidentStore(db);
    expect(await store.getConfirmed(base.id, 'technician-1')).toEqual(base);
    const pending = await store.listPending('technician-1');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation).toMatchObject({ operationId: 'old-note-001', payload: { text: 'nota antigua' } });
    expect(pending[0]?.status).toBe('conflicto');
  });
  test.each(['rows-copied', 'legacy-dropped', 'version-updated'] as const)(
    'failure after %s restores old schema and data after reopening, then recovers', async failingStep => {
      await expect(migrateIncidentStore(db, { afterStep: step => {
        if (step === failingStep) throw new Error('injected');
      } })).rejects.toThrow('injected');
      db.close(); db = openDb(join(dir, 'data.sqlite'));
      expect(db.raw.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get()?.value).toBe('1');
      expect(db.raw.prepare('SELECT payload FROM operations').get()?.payload).toBe('{"text":"nota antigua"}');
      expect(db.raw.prepare("SELECT name FROM sqlite_master WHERE name='queue_operations'").get()).toBeUndefined();
      expect((await migrateIncidentStore(db)).to).toBe(LATEST_SCHEMA_VERSION);
      expect((await new SQLiteIncidentStore(db).listPending('technician-1'))).toHaveLength(1);
    });
  test('rejects invalid or future schema without overwriting data', async () => {
    db.raw.exec("UPDATE schema_meta SET value = 'corrupt'");
    await expect(migrateIncidentStore(db)).rejects.toThrow('invalida');
    db.raw.exec("UPDATE schema_meta SET value = '999'");
    await expect(migrateIncidentStore(db)).rejects.toThrow('nuevo');
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM operations').get()?.n).toBe(1);
  });
  test('repairs the earlier v2 minimal queue without losing its intent or incident', async () => {
    db.raw.exec("UPDATE schema_meta SET value='2'; DROP TABLE operations; CREATE TABLE queue_operations (operation_id TEXT PRIMARY KEY, actor_id TEXT, incident_id TEXT, sequence INTEGER, status TEXT, record_json TEXT)");
    const operation = { operationId: 'legacy-v2-operation', actorId: 'technician-1', incidentId: base.id,
      baseVersion: 1, action: 'comment', payload: { text: 'Conservar v2' } };
    db.raw.prepare('INSERT INTO queue_operations VALUES (?, ?, ?, ?, ?, ?)').run(
      operation.operationId, operation.actorId, base.id, 1, 'sincronizando',
      JSON.stringify({ operation, sequence: 1, status: 'sincronizando' }));
    await migrateIncidentStore(db);
    const store = new SQLiteIncidentStore(db);
    const recovered = await store.getRecord(operation.operationId, operation.actorId);
    expect(recovered?.operation).toEqual(operation);
    expect(recovered?.status).toBe('conflicto');
    expect(recovered?.issue?.kind).toBe('contract');
    expect(await store.getConfirmed(base.id, operation.actorId)).toEqual(base);
  });
});
