import { createIncidentSyncService } from '../src/application/createIncidentSyncService';
import type { IncidentActionClient } from '../src/application/createIncidentSyncService';
import type {
  IncidentQueuePort,
  IncidentQueueRecord,
  PreparedRequest,
  ConfirmationAcknowledgement,
} from '../src/domain/IncidentQueueRecord';
import type { SyncRecord } from '../src/course-evaluation/contracts';

class InMemoryQueuePort implements IncidentQueuePort {
  public records = new Map<string, IncidentQueueRecord>();
  public confirmedRecords = new Map<string, SyncRecord>();
  public calls = {
    prepareRequest: [] as PreparedRequest[],
    markSending: [] as string[],
    confirm: [] as ConfirmationAcknowledgement[],
    markIssue: [] as { operationId: string; issue: NonNullable<IncidentQueueRecord['issue']> }[],
    recoverInterrupted: 0,
  };

  async enqueue(record: IncidentQueueRecord): Promise<void> {
    this.records.set(record.operation.operationId, record);
  }

  async listPending(actorId: string): Promise<readonly IncidentQueueRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.operation.actorId === actorId && r.status !== 'confirmada'
    );
  }

  async getRecord(operationId: string, actorId: string): Promise<IncidentQueueRecord | null> {
    const rec = this.records.get(operationId);
    return rec && rec.operation.actorId === actorId ? rec : null;
  }

  async getConfirmed(incidentId: string, _actorId: string): Promise<SyncRecord | null> {
    return this.confirmedRecords.get(incidentId) ?? null;
  }

  async prepareRequest(
    operationId: string,
    actorId: string,
    request: PreparedRequest
  ): Promise<PreparedRequest> {
    this.calls.prepareRequest.push(request);
    const rec = await this.getRecord(operationId, actorId);
    if (rec) {
      this.records.set(operationId, { ...rec, preparedRequest: request });
    }
    return request;
  }

  async markSending(operationId: string, actorId: string): Promise<void> {
    this.calls.markSending.push(operationId);
    const rec = await this.getRecord(operationId, actorId);
    if (rec) {
      this.records.set(operationId, { ...rec, status: 'enviando' });
    }
  }

  async markIssue(
    operationId: string,
    actorId: string,
    issue: NonNullable<IncidentQueueRecord['issue']>
  ): Promise<void> {
    this.calls.markIssue.push({ operationId, issue });
    const rec = await this.getRecord(operationId, actorId);
    if (rec) {
      const newStatus =
        issue.kind === 'conflict'
          ? 'conflicto'
          : issue.kind === 'forbidden'
          ? 'bloqueada'
          : 'pendiente';
      this.records.set(operationId, { ...rec, status: newStatus, issue });
    }
  }

  async confirm(
    operationId: string,
    actorId: string,
    ack: ConfirmationAcknowledgement
  ): Promise<void> {
    this.calls.confirm.push(ack);
    const rec = await this.getRecord(operationId, actorId);
    if (rec) {
      this.records.set(operationId, {
        ...rec,
        status: 'confirmada',
        confirmation: ack,
      });
      this.confirmedRecords.set(ack.incident.id, ack.incident);
    }
  }

  async recoverInterrupted(): Promise<void> {
    this.calls.recoverInterrupted++;
    for (const [id, rec] of this.records.entries()) {
      if (rec.status === 'enviando') {
        this.records.set(id, { ...rec, status: 'pendiente' });
      }
    }
  }
}

describe('Week 8 - Idempotencia y Resiliencia del Servicio de Sincronización', () => {
  const actorId = 'tech-1';
  const incidentId = 'campus-inc-001';

  it('F-I01: reintento tras timeout confirma con duplicate: true sin duplicar la operación', async () => {
    const queue = new InMemoryQueuePort();
    const initialRecord: IncidentQueueRecord = {
      operation: {
        operationId: 'op-retry-001',
        incidentId,
        actorId,
        baseVersion: 1,
        action: 'start',
        payload: {},
      },
      base: { id: incidentId, version: 1, fields: { work: { status: 'assigned' } } },
      local: { id: incidentId, version: 1, fields: { work: { status: 'in_progress' } } },
      sequence: 1,
      dependsOn: [],
      status: 'pendiente',
      preparedRequest: null,
      confirmation: null,
      issue: null,
    };
    await queue.enqueue(initialRecord);

    const client: IncidentActionClient = {
      performIncidentAction: jest.fn().mockResolvedValue({
        operationId: 'op-retry-001',
        incident: {
          kind: 'available',
          incident: {
            id: incidentId,
            version: 2,
            payload: { work: { status: 'in_progress', assignedTechnicianId: actorId } },
          },
        },
        duplicate: true,
      }),
    };

    const service = createIncidentSyncService({
      queuePort: queue,
      incidentClient: client,
      getCurrentActor: () => actorId,
    });

    const result = await service.syncPending();

    expect(result.processed).toBe(1);
    expect(result.issues).toBe(0);
    expect(client.performIncidentAction).toHaveBeenCalledTimes(1);

    const updated = await queue.getRecord('op-retry-001', actorId);
    expect(updated?.status).toBe('confirmada');
    expect(updated?.confirmation?.duplicate).toBe(true);
    expect(updated?.confirmation?.operationId).toBe('op-retry-001');
  });

  it('F-I02: falla de red conserva la operación en disco como pendiente sin retirarla', async () => {
    const queue = new InMemoryQueuePort();
    const opId = 'op-net-fail-002';
    await queue.enqueue({
      operation: {
        operationId: opId,
        incidentId,
        actorId,
        baseVersion: 1,
        action: 'comment',
        payload: { text: 'Nota en offline' },
      },
      base: { id: incidentId, version: 1, fields: {} },
      local: { id: incidentId, version: 1, fields: { notes: [{ actorId, text: 'Nota en offline' }] } },
      sequence: 1,
      dependsOn: [],
      status: 'pendiente',
      preparedRequest: null,
      confirmation: null,
      issue: null,
    });

    const client: IncidentActionClient = {
      performIncidentAction: jest.fn().mockRejectedValue({
        status: 500,
        message: 'Internal Server Error',
      }),
    };

    const service = createIncidentSyncService({
      queuePort: queue,
      incidentClient: client,
      getCurrentActor: () => actorId,
    });

    const result = await service.syncPending();

    expect(result.processed).toBe(0);
    expect(result.issues).toBe(1);

    const recordInQueue = await queue.getRecord(opId, actorId);
    expect(recordInQueue?.status).toBe('pendiente');
    expect(recordInQueue?.issue?.kind).toBe('network');
    expect(recordInQueue?.issue?.httpStatus).toBe(500);
    expect(queue.calls.confirm).toHaveLength(0);
  });

  it('Dependencias: la operación dependiente no se envía si la previa no está confirmada', async () => {
    const queue = new InMemoryQueuePort();

    await queue.enqueue({
      operation: {
        operationId: 'op-A',
        incidentId,
        actorId,
        baseVersion: 1,
        action: 'start',
        payload: {},
      },
      base: { id: incidentId, version: 1, fields: {} },
      local: { id: incidentId, version: 1, fields: {} },
      sequence: 1,
      dependsOn: [],
      status: 'pendiente',
      preparedRequest: null,
      confirmation: null,
      issue: null,
    });

    await queue.enqueue({
      operation: {
        operationId: 'op-B',
        incidentId,
        actorId,
        baseVersion: 1,
        action: 'comment',
        payload: { text: 'Nota posterior a start' },
      },
      base: { id: incidentId, version: 1, fields: {} },
      local: { id: incidentId, version: 1, fields: {} },
      sequence: 2,
      dependsOn: ['op-A'],
      status: 'pendiente',
      preparedRequest: null,
      confirmation: null,
      issue: null,
    });

    const client: IncidentActionClient = {
      performIncidentAction: jest.fn().mockRejectedValue({ status: 503 }),
    };

    const service = createIncidentSyncService({
      queuePort: queue,
      incidentClient: client,
      getCurrentActor: () => actorId,
    });

    const result = await service.syncPending();

    expect(result.processed).toBe(0);
    expect(result.issues).toBe(2);

    const opB = await queue.getRecord('op-B', actorId);
    expect(opB?.issue?.kind).toBe('dependency');
    expect(client.performIncidentAction).toHaveBeenCalledTimes(1);
  });
});