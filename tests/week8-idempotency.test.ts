import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteIncidentStore } from '../src/infrastructure/SQLiteIncidentStore';
import { migrateIncidentStore } from '../src/infrastructure/incidentMigrations';
import { createIncidentSyncService, type IncidentActionClient } from '../src/application/createIncidentSyncService';
import { createIncidentClient } from '../src/api/incidentClient';
import { openDb, record, base, prepared, startBackend, syncClient, transport } from './helpers/week8';

describe('Week 8: real backend + durable queue synchronization', () => {
  let dir: string;
  let db: ReturnType<typeof openDb>;
  let queue: SQLiteIncidentStore;
  let backend: Awaited<ReturnType<typeof startBackend>>;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'campus-sync-'));
    db = openDb(join(dir, 'queue.sqlite'));
    await migrateIncidentStore(db);
    queue = new SQLiteIncidentStore(db);
    backend = await startBackend();
  });
  afterEach(() => { backend?.close(); db.close(); rmSync(dir, { recursive: true, force: true }); });
  function service(client: IncidentActionClient = syncClient(backend.url)) {
    return createIncidentSyncService({ queuePort: queue, incidentClient: client,
      getCurrentActor: () => 'technician-1' });
  }
  test('lost response after commit, reopen, same request, one server effect, then dependent note', async () => {
    const r = record();
    await queue.enqueue(r);
    await queue.enqueue(record('operation-note-002', 'comment', [r.operation.operationId]));
    let lost = true;
    const client = syncClient(backend.url, transport(method =>
      lost && method === 'POST' ? 'timeout_after_commit' : undefined), 300);
    expect(await service(client).syncPending()).toEqual({ processed: 0, issues: 2 });
    const requestBefore = (await queue.getRecord(r.operation.operationId, 'technician-1'))?.preparedRequest;
    expect(requestBefore?.body.baseVersion).toBe(1);
    const remoteClient = createIncidentClient({ baseUrl: backend.url, actorId: 'technician-1', transport: transport() });
    expect((await remoteClient.getIncidentSnapshot(base.id)).version).toBe(2);
    db.close(); db = openDb(join(dir, 'queue.sqlite')); queue = new SQLiteIncidentStore(db);
    lost = false;
    expect(await service(client).syncPending()).toEqual({ processed: 2, issues: 0 });
    const ack = await queue.getRecord(r.operation.operationId, 'technician-1');
    expect(ack?.preparedRequest).toEqual(requestBefore);
    expect(ack?.confirmation?.duplicate).toBe(true);
    const note = await queue.getRecord('operation-note-002', 'technician-1');
    expect(note?.preparedRequest?.body).toEqual({ action: 'comment', baseVersion: 2, text: 'Nota ficticia' });
    expect((await remoteClient.getIncidentSnapshot(base.id)).version).toBe(3);
    expect((await remoteClient.getIncidentSnapshot(base.id)).fields.notes).toHaveLength(1);
    const response = await transport().request({ method: 'GET', path: backend.url + '/v1/incidents/' + base.id,
      headers: { Authorization: 'Bearer course-valid-token', 'X-Course-Actor': 'coordinator-1' } });
    const dto = await response.json() as { payload: { history: { operationId: string }[] } };
    expect(dto.payload.history.filter(h => h.operationId === r.operation.operationId)).toHaveLength(1);
    expect(await queue.listPending('technician-1')).toEqual([]);
  });
  test('reassignment yields 403, persists blocked intention and keeps dependent note', async () => {
    const r = record();
    await queue.enqueue(r);
    await queue.enqueue(record('operation-note-002', 'comment', [r.operation.operationId]));
    const coordinator = createIncidentClient({ baseUrl: backend.url, actorId: 'coordinator-1', transport: transport() });
    await coordinator.performIncidentAction(base.id, { action: 'assign', baseVersion: 1, technicianId: 'technician-2' }, 'reassign-operation-001');
    expect(await service().syncPending()).toEqual({ processed: 0, issues: 2 });
    expect((await queue.getRecord(r.operation.operationId, 'technician-1'))?.status).toBe('bloqueada');
    expect((await coordinator.getIncidentSnapshot(base.id)).fields.work).toEqual({
      status: 'assigned', assignedTechnicianId: 'technician-2',
    });
    db.close(); db = openDb(join(dir, 'queue.sqlite')); queue = new SQLiteIncidentStore(db);
    expect(await queue.listPending('technician-1')).toHaveLength(2);
    expect((await queue.getRecord(r.operation.operationId, 'technician-1'))?.operation).toEqual(r.operation);
  });
  test('compatible remote priority is preserved and uses the current version only before first send', async () => {
    await queue.enqueue(record());
    const coordinator = createIncidentClient({ baseUrl: backend.url, actorId: 'coordinator-1', transport: transport() });
    await coordinator.performIncidentAction(base.id, { action: 'prioritize', baseVersion: 1, priority: 'high' }, 'priority-operation-001');
    expect(await service().syncPending()).toEqual({ processed: 1, issues: 0 });
    const snapshot = await coordinator.getIncidentSnapshot(base.id);
    expect(snapshot.fields.priority).toBe('high');
    expect(snapshot.version).toBe(3);
  });
  test('HTTP 500 preserves pending payload and no confirmation', async () => {
    const r = record('operation-note-001', 'comment'); await queue.enqueue(r);
    expect(await service(syncClient(backend.url, transport(() => 'server_error'))).syncPending())
      .toEqual({ processed: 0, issues: 1 });
    expect((await queue.getRecord(r.operation.operationId, 'technician-1'))?.confirmation).toBeNull();
    expect((await queue.getRecord(r.operation.operationId, 'technician-1'))?.status).toBe('pendiente');
  });
  test('wrong confirmation cannot remove an operation', async () => {
    const r = record(); await queue.enqueue(r);
    const client: IncidentActionClient = {
      getIncidentSnapshot: async () => base,
      performIncidentAction: async () => ({ operationId: 'wrong-id', incident: { ...r.local, version: 2 }, duplicate: false }),
    };
    expect(await service(client).syncPending()).toEqual({ processed: 0, issues: 1 });
    expect((await queue.getRecord(r.operation.operationId, 'technician-1'))?.status).toBe('conflicto');
  });
  test('409 compares real remote notes, never invents a work conflict', async () => {
    const r = record('operation-note-001', 'comment'); await queue.enqueue(r);
    await queue.prepareRequest(r.operation.operationId, 'technician-1', prepared(r));
    const remote = { ...base, version: 2, fields: { ...base.fields, notes: [{ actorId: 'reporter-1', text: 'Otra nota' }] } };
    const client: IncidentActionClient = { getIncidentSnapshot: async () => remote,
      performIncidentAction: async () => { throw Object.assign(new Error('version_conflict'), { status: 409 }); } };
    await service(client).syncPending();
    expect((await queue.getRecord(r.operation.operationId, 'technician-1'))?.issue?.fields).toEqual(['notes']);
  });
  test('logout during preparation prevents sending, and concurrent sync is single-flight', async () => {
    await queue.enqueue(record());
    let actor: string | null = 'technician-1';
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const send = jest.fn();
    const client: IncidentActionClient = { getIncidentSnapshot: async () => { await gate; return base; },
      performIncidentAction: send };
    const sync = createIncidentSyncService({ queuePort: queue, incidentClient: client, getCurrentActor: () => actor });
    const first = sync.syncPending();
    expect(await sync.syncPending()).toEqual({ processed: 0, issues: 0 });
    actor = null; release();
    await first;
    expect(send).not.toHaveBeenCalled();
    expect(await queue.listPending('technician-1')).toHaveLength(1);
  });
});
