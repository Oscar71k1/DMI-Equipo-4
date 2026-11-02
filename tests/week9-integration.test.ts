import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteIncidentStore } from '../src/infrastructure/SQLiteIncidentStore';
import { migrateIncidentStore } from '../src/infrastructure/incidentMigrations';
import { createIncidentClient } from '../src/api/incidentClient';
import { createOfflineIncidentActions } from '../src/application/createOfflineIncidentActions';
import type { IncidentActionClient } from '../src/application/createIncidentSyncService';
import type { RetryExecutionMetric } from '../src/application/retryExecutor';
import type { HttpTransport } from '../src/domain/HttpTransport';
import { openDb, startBackend, transport } from './helpers/week8';

test('real backend commits resolution, loses response, SQLite reopens and replays exact request once without duplicate effects', async () => {
  const backend = await startBackend();
  const dir = mkdtempSync(join(tmpdir(), 'week9-resolve-'));
  let db = openDb(join(dir, 'queue.sqlite'));
  try {
    await migrateIncidentStore(db);
    let store = new SQLiteIncidentStore(db);
    const ordinary = createIncidentClient({ baseUrl: backend.url, actorId: 'technician-1', transport: transport() });
    await ordinary.performIncidentAction('campus-inc-001', { action: 'start', baseVersion: 1 }, 'week9-start-op');
    await ordinary.performIncidentAction('campus-inc-001', { action: 'add_evidence', baseVersion: 2, evidenceId: 'synthetic-evidence' }, 'week9-evidence-op');
    let loseAll = true;
    const attempts: { key: string | undefined; body: unknown }[] = [];
    const observations: (readonly RetryExecutionMetric[])[] = [];
    const http: HttpTransport = { async request(input) {
      if (input.method === 'POST') {
        attempts.push({ key: input.headers?.['Idempotency-Key'], body: input.body });
        if (loseAll) {
          // Send to the actual backend, let it commit, then lose even replay acknowledgements.
          await transport(() => 'timeout_after_commit').request({ ...input, signal: undefined } as never);
          throw Object.assign(new Error('Lost response'), { name: 'AbortError' });
        }
      }
      return transport().request(input);
    } };
    // Abort-aware HTTP for the first lost response; subsequent lost replies deliberately ignore abort.
    // The executor must still terminate by its own deadline and leave the durable request pending.
    const client = createIncidentClient({ baseUrl: backend.url, actorId: 'technician-1', transport: http,
      timeoutMs: 100, retry: { policy: { maxAttempts: 2, baseDelayMs: 10 } }, onRetryMetrics: m => observations.push(m) });
    const port: IncidentActionClient = { getIncidentSnapshot: client.getIncidentSnapshot,
      async performIncidentAction(id, body, key) {
        const ack = await client.performIncidentAction(id, body, key);
        if (!ack.snapshot) throw new Error('Invalid confirmation');
        return { operationId: ack.operationId, incident: ack.snapshot, duplicate: ack.duplicate };
      } };
    const makeApp = () => createOfflineIncidentActions({ store, client: port,
      getActor: () => ({ id: 'technician-1', role: 'technician' }), getSessionKey: () => 1, newId: () => 'week9-resolve-op' });
    let app = makeApp();
    await app.cacheIncident('campus-inc-001');
    await app.queueAction('campus-inc-001', 'resolve', { diagnosis: 'Diagnóstico sintético' });
    expect(await app.syncPending()).toEqual({ processed: 0, issues: 1 });
    const before = (await store.getRecord('week9-resolve-op', 'technician-1'))?.preparedRequest;
    expect(before?.body.action).toBe('resolve');
    expect((await ordinary.getIncidentSnapshot('campus-inc-001')).fields.work).toMatchObject({ status: 'resolved' });
    db.close(); db = openDb(join(dir, 'queue.sqlite')); store = new SQLiteIncidentStore(db);
    loseAll = false; app = makeApp();
    expect(await app.syncPending()).toEqual({ processed: 1, issues: 0 });
    const confirmed = await store.getRecord('week9-resolve-op', 'technician-1');
    expect(confirmed?.preparedRequest).toEqual(before);
    expect(confirmed?.confirmation?.duplicate).toBe(true);
    expect(attempts).toHaveLength(3);
    expect(attempts.every(a => a.key === attempts[0]?.key && JSON.stringify(a.body) === JSON.stringify(attempts[0]?.body))).toBe(true);
    const dto = await (await transport().request({ method: 'GET', path: backend.url + '/v1/incidents/campus-inc-001',
      headers: { Authorization: 'Bearer course-valid-token', 'X-Course-Actor': 'technician-1' } })).json() as
      { version: number; payload: { history: { operationId: string }[]; evidence: unknown[] } };
    expect(dto.version).toBe(4);
    expect(dto.payload.history.filter(h => h.operationId === 'week9-resolve-op')).toHaveLength(1);
    expect(dto.payload.evidence).toHaveLength(1);
    await expect(ordinary.performIncidentAction('campus-inc-001', { action: 'resolve', baseVersion: 3, diagnosis: 'Contenido distinto' }, 'week9-resolve-op')).rejects.toMatchObject({ status: 409 });
    expect(await app.syncPending()).toEqual({ processed: 0, issues: 0 });
    await expect(app.queueAction('campus-inc-001', 'close', {})).rejects.toThrow('Acción no autorizada');
    const coordinator = createIncidentClient({ baseUrl: backend.url, actorId: 'coordinator-1', transport: transport(), retry: {} });
    const coordinatorPort: IncidentActionClient = { getIncidentSnapshot: coordinator.getIncidentSnapshot,
      async performIncidentAction(id, body, key) {
        const ack = await coordinator.performIncidentAction(id, body, key);
        return { operationId: ack.operationId, incident: ack.snapshot!, duplicate: ack.duplicate };
      } };
    const closing = createOfflineIncidentActions({ store, client: coordinatorPort,
      getActor: () => ({ id: 'coordinator-1', role: 'coordinator' }), getSessionKey: () => 1, newId: () => 'week9-close-op' });
    await closing.cacheIncident('campus-inc-001');
    await closing.queueAction('campus-inc-001', 'close', {});
    expect(await closing.syncPending()).toEqual({ processed: 1, issues: 0 });
    expect((await coordinator.getIncidentSnapshot('campus-inc-001')).fields.work).toMatchObject({ status: 'closed' });
    console.info('WEEK09_OBSERVATION ' + JSON.stringify({ id: 'lost-response-durable', attempts: attempts.length,
      stableKey: true, payloadUnchanged: true, reopenedSqlite: true, duplicate: true, version: dto.version,
      resolutionEvents: 1, evidenceBefore: 1, evidenceAfter: dto.payload.evidence.length,
      notifications: { implemented: false, explanation: 'No notification dispatch exists in this app; no emission is claimed.' }, metrics: observations }));
  } finally { backend.close(); db.close(); rmSync(dir, { recursive: true, force: true }); }
}, 20000);

test('real HTTP 429 Retry-After waits before the next request and preserves sanitized timings', async () => {
  const backend = await startBackend();
  try {
    let count = 0;
    const times: number[] = [];
    const metrics: (readonly RetryExecutionMetric[])[] = [];
    const http: HttpTransport = { async request(input) {
      times.push(Date.now()); count++;
      const response = await transport(() => count === 1 ? 'rate_limited' : 'success').request(input);
      return response;
    } };
    const client = createIncidentClient({ baseUrl: backend.url, transport: http, retry: {}, onRetryMetrics: m => metrics.push(m) });
    await client.listIncidents();
    expect(count).toBe(2); expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(1000);
    expect(metrics[0]?.[0]?.plannedDelayMs).toBe(1000);
    console.info('WEEK09_OBSERVATION ' + JSON.stringify({ id: 'real-http-429', calls: count, intervalMs: times[1]! - times[0]!, metrics }));
  } finally { backend.close(); }
}, 15000);
