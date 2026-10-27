import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteIncidentStore } from '../src/infrastructure/SQLiteIncidentStore';
import { migrateIncidentStore } from '../src/infrastructure/incidentMigrations';
import { openDb, base, record, prepared } from './helpers/week8';

describe('Week 8: SQLite port, actual close/reopen and atomic confirmation', () => {
  let dir: string;
  let db: ReturnType<typeof openDb>;
  let store: SQLiteIncidentStore;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'campus-w8-'));
    db = openDb(join(dir, 'queue.sqlite'));
    await migrateIncidentStore(db);
    store = new SQLiteIncidentStore(db);
  });
  afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  test('persists full record, base, note and frozen request across reopen', async () => {
    const r = record('operation-note-001', 'comment');
    await store.enqueue(r);
    await store.prepareRequest(r.operation.operationId, 'technician-1', prepared(r));
    await store.markSending(r.operation.operationId, 'technician-1');
    db.close();
    db = openDb(join(dir, 'queue.sqlite'));
    store = new SQLiteIncidentStore(db);
    await store.recoverInterrupted();
    expect(await store.listPending('technician-1')).toEqual([
      { ...r, sequence: 1, preparedRequest: prepared(r) },
    ]);
    expect(await store.getConfirmed(base.id, 'technician-1')).toEqual(base);
    expect(await store.listPending('technician-2')).toEqual([]);
    await expect(store.markSending(r.operation.operationId, 'technician-2')).rejects.toThrow();
  });
  test('first identity is stable and prepared payload cannot be replaced', async () => {
    const r = record();
    await store.enqueue(r); await store.enqueue(r);
    expect(await store.listPending('technician-1')).toHaveLength(1);
    const req = prepared(r);
    await store.prepareRequest(r.operation.operationId, 'technician-1', req);
    await expect(store.prepareRequest(r.operation.operationId, 'technician-1',
      { ...req, body: { action: 'start', baseVersion: 99 } })).rejects.toThrow('immutable');
    expect((await store.getRecord(r.operation.operationId, 'technician-1'))?.preparedRequest).toEqual(req);
  });
  test('confirmation and snapshot rollback together, then only confirmed operation leaves active queue', async () => {
    const r = record();
    await store.enqueue(r);
    await store.enqueue(record('operation-note-002', 'comment', [r.operation.operationId]));
    await store.prepareRequest(r.operation.operationId, 'technician-1', prepared(r));
    const ack = { operationId: r.operation.operationId, incident: { ...r.local, version: 2 }, duplicate: false };
    db.raw.exec("CREATE TRIGGER fail_confirmation BEFORE UPDATE ON queue_operations BEGIN SELECT RAISE(ABORT, 'injected'); END;");
    await expect(store.confirm(r.operation.operationId, 'technician-1', ack)).rejects.toThrow('injected');
    expect(await store.getConfirmed(base.id, 'technician-1')).toEqual(base);
    expect(await store.listPending('technician-1')).toHaveLength(2);
    db.raw.exec('DROP TRIGGER fail_confirmation');
    await store.confirm(r.operation.operationId, 'technician-1', ack);
    expect(await store.listPending('technician-1')).toHaveLength(1);
    expect((await store.getRecord(r.operation.operationId, 'technician-1'))?.confirmation).toEqual(ack);
    await store.saveConfirmed('technician-1', { ...r.local, version: 5 });
    await store.confirm(r.operation.operationId, 'technician-1', { ...ack, duplicate: true });
    expect((await store.getConfirmed(base.id, 'technician-1'))?.version).toBe(5);
  });
  test('rejects wrong acknowledgement and unconfirmed dependency, serializes concurrent writes', async () => {
    const r = record();
    await Promise.all([store.enqueue(r), store.enqueue(record('operation-note-003', 'comment'))]);
    expect((await store.listPending('technician-1')).map(r => r.sequence)).toEqual([1, 2]);
    const dependent = record('operation-note-004', 'comment', [r.operation.operationId]);
    await store.enqueue(dependent);
    await expect(store.prepareRequest(dependent.operation.operationId, 'technician-1', prepared(dependent))).rejects.toThrow('dependency');
    await store.prepareRequest(r.operation.operationId, 'technician-1', prepared(r));
    await expect(store.confirm(r.operation.operationId, 'technician-1', {
      operationId: 'wrong-id', incident: { ...r.local, version: 2 }, duplicate: false,
    })).rejects.toThrow('confirmation');
    expect(await store.listPending('technician-1')).toHaveLength(3);
  });
});
