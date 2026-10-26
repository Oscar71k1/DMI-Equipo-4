import type { SqlDatabase } from './SqlDatabase';
import type {
  IncidentQueuePort, IncidentQueueRecord, QueueSyncRecord, PreparedRequest,
  ConfirmationAcknowledgement,
} from '../domain/IncidentQueueRecord';
import { assertSnapshot, makeActionBody, projectOperation } from '../domain/IncidentQueueRecord';
import { deepEqual } from '../domain/incidentSync';

export class SQLiteIncidentStore implements IncidentQueuePort {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly db: SqlDatabase) {}
  private atomic<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => this.db.transaction(work));
    this.tail = result.catch(() => undefined);
    return result;
  }
  private async read(id: string, actor: string): Promise<IncidentQueueRecord | null> {
    const rows = await this.db.all<{ record_json: string }>(
      'SELECT record_json FROM queue_operations WHERE operation_id = ? AND actor_id = ?', [id, actor]);
    const value = rows[0];
    if (!value) return null;
    const record = JSON.parse(value.record_json) as IncidentQueueRecord;
    if (record.operation.operationId !== id || record.operation.actorId !== actor) throw new Error('Corrupt queue identity');
    return record;
  }
  private async require(id: string, actor: string): Promise<IncidentQueueRecord> {
    const record = await this.read(id, actor);
    if (!record) throw new Error('Operation unavailable for actor');
    return record;
  }
  private async write(record: IncidentQueueRecord): Promise<void> {
    await this.db.run(
      'UPDATE queue_operations SET status = ?, record_json = ? WHERE operation_id = ? AND actor_id = ?',
      [record.status, JSON.stringify(record), record.operation.operationId, record.operation.actorId]);
  }
  private async cache(actor: string, snapshot: QueueSyncRecord): Promise<void> {
    assertSnapshot(snapshot);
    await this.db.run(
      'INSERT INTO incident_snapshots (incident_id, actor_id, version, body_json) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(incident_id, actor_id) DO UPDATE SET version = excluded.version, body_json = excluded.body_json ' +
      'WHERE excluded.version >= incident_snapshots.version',
      [snapshot.id, actor, snapshot.version, JSON.stringify(snapshot)]);
  }
  async saveConfirmed(actor: string, snapshot: QueueSyncRecord): Promise<void> {
    if (!actor.trim()) throw new Error('Invalid actor');
    return this.atomic(() => this.cache(actor, snapshot));
  }
  async listConfirmed(actor: string): Promise<readonly QueueSyncRecord[]> {
    return this.atomic(async () => {
      const rows = await this.db.all<{ body_json: string }>(
        'SELECT body_json FROM incident_snapshots WHERE actor_id = ?', [actor]);
      return rows.map(row => { const value: unknown = JSON.parse(row.body_json); assertSnapshot(value); return value; });
    });
  }
  async enqueue(record: IncidentQueueRecord): Promise<void> {
    assertSnapshot(record.base);
    if (!/^[\x21-\x7E]{8,}$/.test(record.operation.operationId) || !record.operation.actorId.trim() ||
        record.operation.baseVersion !== record.base.version || record.base.id !== record.operation.incidentId ||
        !deepEqual(projectOperation(record.base, record.operation), record.local) ||
        record.status !== 'pendiente' || record.preparedRequest !== null || record.confirmation !== null) {
      throw new Error('Invalid pending record');
    }
    return this.atomic(async () => {
      const existing = await this.read(record.operation.operationId, record.operation.actorId);
      if (existing) {
        if (!deepEqual(existing.operation, record.operation)) throw new Error('Operation identity reused');
        return;
      }
      const rows = await this.db.all<{ maxSeq: number | null }>(
        'SELECT MAX(sequence) as maxSeq FROM queue_operations WHERE actor_id = ?', [record.operation.actorId]);
      const sequence = (rows[0]?.maxSeq ?? 0) + 1;
      for (const dependency of record.dependsOn) {
        const parent = await this.require(dependency, record.operation.actorId);
        if (parent.operation.incidentId !== record.operation.incidentId) throw new Error('Invalid dependency');
      }
      const saved = { ...record, sequence };
      await this.db.run(
        'INSERT INTO queue_operations (operation_id, actor_id, incident_id, sequence, status, record_json) VALUES (?, ?, ?, ?, ?, ?)',
        [record.operation.operationId, record.operation.actorId, record.operation.incidentId,
          sequence, saved.status, JSON.stringify(saved)]);
      await this.cache(record.operation.actorId, record.base);
    });
  }
  async listPending(actor: string): Promise<readonly IncidentQueueRecord[]> {
    return this.atomic(async () => {
      const rows = await this.db.all<{ record_json: string }>(
        'SELECT record_json FROM queue_operations WHERE actor_id = ? AND status != ? ORDER BY sequence ASC',
        [actor, 'confirmada']);
      return rows.map(row => JSON.parse(row.record_json) as IncidentQueueRecord);
    });
  }
  getRecord(id: string, actor: string): Promise<IncidentQueueRecord | null> {
    return this.atomic(() => this.read(id, actor));
  }
  getConfirmed(id: string, actor: string): Promise<QueueSyncRecord | null> {
    return this.atomic(async () => {
      const rows = await this.db.all<{ body_json: string }>(
        'SELECT body_json FROM incident_snapshots WHERE incident_id = ? AND actor_id = ?', [id, actor]);
      if (!rows[0]) return null;
      const value: unknown = JSON.parse(rows[0].body_json);
      assertSnapshot(value);
      return value;
    });
  }
  prepareRequest(id: string, actor: string, request: PreparedRequest): Promise<PreparedRequest> {
    return this.atomic(async () => {
      const record = await this.require(id, actor);
      if (record.preparedRequest) {
        if (!deepEqual(record.preparedRequest, request)) throw new Error('Prepared request is immutable');
        return record.preparedRequest;
      }
      if (record.status !== 'pendiente' || request.actorId !== actor || request.idempotencyKey !== id ||
          request.path !== `/v1/incidents/${encodeURIComponent(record.operation.incidentId)}/actions` ||
          request.base.id !== record.operation.incidentId || request.base.version < record.base.version ||
          !deepEqual(request.body, makeActionBody(record.operation, request.base.version)) ||
          !deepEqual(request.local, projectOperation(request.base, record.operation))) {
        throw new Error('Invalid prepared request');
      }
      for (const dependency of record.dependsOn) {
        if ((await this.require(dependency, actor)).status !== 'confirmada') throw new Error('Unconfirmed dependency');
      }
      await this.write({ ...record, preparedRequest: request, issue: null });
      return JSON.parse(JSON.stringify(request)) as PreparedRequest;
    });
  }
  markSending(id: string, actor: string): Promise<void> {
    return this.atomic(async () => {
      const record = await this.require(id, actor);
      if (!record.preparedRequest || record.status !== 'pendiente') throw new Error('Operation not ready');
      await this.write({ ...record, status: 'enviando', issue: null });
    });
  }
  markIssue(id: string, actor: string, issue: NonNullable<IncidentQueueRecord['issue']>): Promise<void> {
    return this.atomic(async () => {
      const record = await this.require(id, actor);
      if (record.status === 'confirmada') throw new Error('Confirmed operation is immutable');
      const status = issue.kind === 'conflict' || issue.kind === 'contract' ? 'conflicto' :
        issue.kind === 'forbidden' ? 'bloqueada' : 'pendiente';
      await this.write({ ...record, status, issue });
    });
  }
  confirm(id: string, actor: string, ack: ConfirmationAcknowledgement): Promise<void> {
    assertSnapshot(ack.incident);
    return this.atomic(async () => {
      const record = await this.require(id, actor);
      if (!record.preparedRequest || ack.operationId !== id || ack.incident.id !== record.operation.incidentId ||
          ack.incident.version <= record.preparedRequest.base.version || typeof ack.duplicate !== 'boolean') {
        throw new Error('Invalid confirmation');
      }
      if (record.status === 'confirmada') {
        if (!deepEqual(record.confirmation?.incident, ack.incident)) throw new Error('Conflicting acknowledgement');
        return;
      }
      await this.cache(actor, ack.incident);
      await this.write({ ...record, status: 'confirmada', confirmation: ack, issue: null });
    });
  }
  recoverInterrupted(): Promise<void> {
    return this.atomic(async () => {
      const rows = await this.db.all<{ record_json: string }>(
        'SELECT record_json FROM queue_operations WHERE status = ?', ['enviando']);
      for (const row of rows) {
        const record = JSON.parse(row.record_json) as IncidentQueueRecord;
        await this.write({ ...record, status: 'pendiente' });
      }
    });
  }
}
