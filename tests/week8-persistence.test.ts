import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateIncidentStore } from '../src/infrastructure/incidentMigrations';
import { SQLiteIncidentStore } from '../src/infrastructure/SQLiteIncidentStore';
import type { PendingIncidentOperation } from '../src/campusops/contracts';

function openTestDb(file: string) {
  const raw = new DatabaseSync(file);
  return {
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

describe('Week 8 - Persistencia y Recuperacion', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'w8-persist-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('Guarda una operacion, cierra la base y la recupera con una nueva instancia', async () => {
    const dbPath = join(tempDir, 'persistence.sqlite');

    let db = openTestDb(dbPath);
    await migrateIncidentStore(db);
    let store = new SQLiteIncidentStore(db);

    const opId = 'op-jarumi-001';
    const op: PendingIncidentOperation = {
      operationId: opId,
      incidentId: 'campus-inc-001',
      baseVersion: 1,
      actorId: 'technician-1',
      action: 'start',
      payload: { note: 'Iniciando atencion' },
    };

    await store.enqueueOperation('technician-1', op);

    db.close();

    db = openTestDb(dbPath);
    store = new SQLiteIncidentStore(db);

    const pending = await store.getPendingOperations('technician-1');
    expect(pending.length).toBe(1);
    expect(pending[0]?.operation.operationId).toBe(opId);
    expect(pending[0]?.status).toBe('pendiente');

    db.close();
  });
});