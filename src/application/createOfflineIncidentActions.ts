import type { Actor } from '../domain/Actor';
import type { PendingIncidentOperation } from '../campusops/contracts';
import type { IncidentQueuePort, IncidentQueueRecord, QueueSyncRecord } from '../domain/IncidentQueueRecord';
import { projectOperation } from '../domain/IncidentQueueRecord';
import { canPerformIncidentAction } from '../domain/incidentAuthorization';
import { mapRemoteIncidentToDomain } from '../domain/IncidentRemoteMapper';
import { createIncidentSyncService, type IncidentActionClient } from './createIncidentSyncService';

export interface LocalIncidentPort extends IncidentQueuePort {
  saveConfirmed(actor: string, snapshot: QueueSyncRecord): Promise<void>;
  listConfirmed(actor: string): Promise<readonly QueueSyncRecord[]>;
  acceptRemote(id: string, actor: string, remote: QueueSyncRecord | null, decidedAt: string): Promise<void>;
}
export type OfflineActions = Readonly<{
  cacheIncident(id: string): Promise<void>;
  queueAction(id: string, action: 'start' | 'comment' | 'add_evidence', payload: Record<string, unknown>): Promise<string>;
  listPending(): Promise<readonly IncidentQueueRecord[]>;
  listCached(): Promise<readonly QueueSyncRecord[]>;
  syncPending(): Promise<{ processed: number; issues: number }>;
  acceptRemote(operationId: string): Promise<void>;
}>;
export function createOfflineIncidentActions(options: {
  store: LocalIncidentPort;
  client: IncidentActionClient;
  getActor(): Actor;
  getSessionKey(): unknown;
  newId(): string;
}): OfflineActions {
  const { store, client, getActor, getSessionKey } = options;
  const sync = createIncidentSyncService({
    queuePort: store, incidentClient: client, getCurrentActor: () => {
      try { return getActor().id; } catch { return null; }
    }, getSessionKey,
  });
  let queueTail: Promise<unknown> = Promise.resolve();
  return {
    async cacheIncident(id) {
      const actor = getActor();
      const generation = getSessionKey();
      const snapshot = await client.getIncidentSnapshot(id);
      if (getActor().id !== actor.id || generation !== getSessionKey()) throw new Error('Session changed');
      await store.saveConfirmed(actor.id, snapshot);
    },
    queueAction(id, action, payload) {
      // Capture identity at invocation, not when a queued storage write eventually runs.
      const actor = getActor();
      const generation = getSessionKey();
      const result = queueTail.then(async () => {
        if (getActor().id !== actor.id || generation !== getSessionKey()) throw new Error('Session changed');
        const base = await store.getConfirmed(id, actor.id);
        if (!base) throw new Error('Primero guarda una copia de la incidencia con conexión');
        const work = base.fields.work as Record<string, unknown>;
        const mapped = mapRemoteIncidentToDomain({ id, status: String(work?.status),
          payload: { ...base.fields } });
        if (!mapped.ok || !canPerformIncidentAction(actor, mapped.value, action)) throw new Error('Acción no autorizada');
        const operation: PendingIncidentOperation = {
          operationId: options.newId(), incidentId: id, actorId: actor.id,
          baseVersion: base.version, action, payload,
        };
        const pending = (await store.listPending(actor.id)).filter(r => r.operation.incidentId === id && !r.resolution);
        const last = pending[pending.length - 1];
        if (action === 'start' && pending.some(r => r.operation.action === 'start')) throw new Error('Ya hay un inicio pendiente');
        if (getActor().id !== actor.id || generation !== getSessionKey()) throw new Error('Session changed');
        await store.enqueue({ operation, base, local: projectOperation(base, operation), sequence: 0,
          dependsOn: last ? [last.operation.operationId] : [], status: 'pendiente',
          preparedRequest: null, confirmation: null, issue: null });
        return operation.operationId;
      });
      queueTail = result.catch(() => undefined);
      return result;
    },
    async listPending() { return store.listPending(getActor().id); },
    async listCached() { return store.listConfirmed(getActor().id); },
    async acceptRemote(operationId) {
      const actor = getActor();
      const generation = getSessionKey();
      const record = await store.getRecord(operationId, actor.id);
      if (!record) throw new Error('Operation unavailable for actor');
      let remote: QueueSyncRecord | null;
      try { remote = await client.getIncidentSnapshot(record.operation.incidentId); }
      catch (error) {
        if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 403) throw error;
        // A 403 does not authorize exposing the new assignment to the old technician.
        remote = null;
      }
      if (getActor().id !== actor.id || generation !== getSessionKey()) throw new Error('Session changed');
      await store.acceptRemote(operationId, actor.id, remote, new Date().toISOString());
    },
    syncPending: sync.syncPending,
  };
}
