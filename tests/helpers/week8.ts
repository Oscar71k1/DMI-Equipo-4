import { DatabaseSync } from 'node:sqlite';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { SqlDatabase } from '../../src/infrastructure/SqlDatabase';
import type { IncidentQueueRecord, QueueSyncRecord, PreparedRequest } from '../../src/domain/IncidentQueueRecord';
import { makeActionBody, projectOperation } from '../../src/domain/IncidentQueueRecord';
import type { HttpTransport } from '../../src/domain/HttpTransport';
import { createIncidentClient } from '../../src/api/incidentClient';
import type { IncidentActionClient } from '../../src/application/createIncidentSyncService';

export function openDb(file: string) {
  const raw = new DatabaseSync(file);
  const db: SqlDatabase & { raw: DatabaseSync; close(): void } = {
    raw,
    exec: async sql => { raw.exec(sql); },
    run: async (sql, params = []) => { raw.prepare(sql).run(...params); },
    all: async <R>(sql: string, params: readonly (string | number | null)[] = []) =>
      raw.prepare(sql).all(...params).map(r => ({ ...r })) as R[],
    transaction: async <T>(work: () => Promise<T>) => {
      raw.exec('BEGIN');
      try { const result = await work(); raw.exec('COMMIT'); return result; }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    close: () => raw.close(),
  };
  return db;
}
export const base: QueueSyncRecord = {
  id: 'campus-inc-001', version: 1,
  fields: { category: 'connectivity', description: 'Sin conexión en laboratorio ficticio',
    location: 'Edificio de prueba A', reporterId: 'reporter-1', priority: 'medium',
    work: { assignedTechnicianId: 'technician-1', status: 'assigned' }, notes: [], evidence: [] },
};
export function record(id = 'operation-start-001', action: 'start' | 'comment' = 'start',
  dependsOn: readonly string[] = []): IncidentQueueRecord {
  const operation = { operationId: id, incidentId: base.id, actorId: 'technician-1',
    baseVersion: 1, action, payload: action === 'comment' ? { text: 'Nota ficticia' } : {} };
  return { operation, base, local: projectOperation(base, operation), sequence: 0,
    dependsOn, status: 'pendiente', preparedRequest: null, confirmation: null, issue: null };
}
export function prepared(r: IncidentQueueRecord): PreparedRequest {
  return { actorId: r.operation.actorId, path: `/v1/incidents/${r.operation.incidentId}/actions`,
    idempotencyKey: r.operation.operationId, body: makeActionBody(r.operation, r.base.version),
    base: r.base, local: r.local };
}
export function transport(scenario?: (method: string) => string | undefined): HttpTransport {
  return { request: input => new Promise((resolve, reject) => {
    const req = request(input.path, {
      method: input.method,
      headers: { ...input.headers, ...(scenario?.(input.method) ? { 'X-Course-Scenario': scenario(input.method)! } : {}) },
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode ?? 0, json: async () => JSON.parse(body) }));
    });
    const abort = () => req.destroy(new Error('Aborted'));
    input.signal?.addEventListener('abort', abort, { once: true });
    req.once('close', () => input.signal?.removeEventListener('abort', abort));
    req.once('error', reject);
    if (input.signal?.aborted) abort();
    if (input.body !== undefined) req.write(JSON.stringify(input.body));
    req.end();
  }) };
}
export function syncClient(url: string, http: HttpTransport = transport(), timeoutMs = 5000): IncidentActionClient {
  const client = createIncidentClient({ baseUrl: url, actorId: 'technician-1', transport: http, timeoutMs });
  return {
    getIncidentSnapshot: client.getIncidentSnapshot,
    async performIncidentAction(id, body, key) {
      const ack = await client.performIncidentAction(id, body, key);
      if (!ack.snapshot) throw new Error('Unavailable snapshot');
      return { operationId: ack.operationId, incident: ack.snapshot, duplicate: ack.duplicate };
    },
  };
}
export async function startBackend() {
  const child = spawn(process.execPath, [join(__dirname, '../../course-backend/server.mjs')], {
    env: { ...process.env, COURSE_BACKEND_HOST: '127.0.0.1', COURSE_BACKEND_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Backend startup timeout')); }, 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Backend exited ' + code)); });
    child.stdout.on('data', data => {
      const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  return { url, close: () => { child.kill(); } };
}
