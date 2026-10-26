import type { IncidentQueuePort, PreparedActionBody, QueueSyncRecord } from '../domain/IncidentQueueRecord';
import { assertSnapshot, makeActionBody, projectOperation } from '../domain/IncidentQueueRecord';
import { deduplicateOperations } from '../domain/deduplicateOperations';
import { resolveSync } from '../domain/incidentSync';

export interface IncidentActionClient {
  getIncidentSnapshot(incidentId: string): Promise<QueueSyncRecord>;
  performIncidentAction(incidentId: string, input: PreparedActionBody, idempotencyKey: string):
    Promise<{ operationId: string; incident: QueueSyncRecord; duplicate: boolean }>;
}
export type SyncServiceOptions = {
  queuePort: IncidentQueuePort;
  incidentClient: IncidentActionClient;
  getCurrentActor: () => string | null;
  getSessionKey?: () => unknown;
};
export function createIncidentSyncService(options: SyncServiceOptions) {
  const { queuePort: queue, incidentClient: client, getCurrentActor } = options;
  let running = false;
  return {
    async syncPending(): Promise<{ processed: number; issues: number }> {
      const actor = getCurrentActor();
      if (running || !actor) return { processed: 0, issues: 0 };
      const sessionKey = options.getSessionKey?.();
      const active = () => getCurrentActor() === actor && options.getSessionKey?.() === sessionKey;
      running = true;
      let processed = 0;
      let issues = 0;
      try {
        await queue.recoverInterrupted();
        const records = deduplicateOperations((await queue.listPending(actor))
          .map(record => ({ operationId: record.operation.operationId, record })))
          .map(item => item.record).sort((a, b) => a.sequence - b.sequence);
        const stopped = new Set<string>();
        for (const listed of records) {
          if (!active()) break;
          const record = await queue.getRecord(listed.operation.operationId, actor);
          if (!record || record.status === 'confirmada' || record.resolution) continue;
          const { operation } = record;
          if (record.status === 'conflicto' || record.status === 'bloqueada') {
            stopped.add(operation.incidentId);
            continue;
          }
          if (stopped.has(operation.incidentId)) {
            await queue.markIssue(operation.operationId, actor, { kind: 'dependency' });
            issues++;
            continue;
          }
          let prepared = record.preparedRequest;
          let phase: 'contract' | 'network' = 'contract';
          try {
            let base = record.base;
            for (const dependency of record.dependsOn) {
              const previous = await queue.getRecord(dependency, actor);
              if (!previous?.confirmation || previous.status !== 'confirmada' ||
                  previous.operation.incidentId !== operation.incidentId) {
                throw Object.assign(new Error('Dependency pending'), { dependency: true });
              }
              base = previous.confirmation.incident;
            }
            if (!prepared) {
              const local = projectOperation(base, operation);
              phase = 'network';
              const remote = await client.getIncidentSnapshot(operation.incidentId);
              phase = 'contract';
              assertSnapshot(remote);
              if (remote.id !== base.id || remote.version < base.version) throw new Error('Invalid remote base');
              const comparison = resolveSync(base, local, remote);
              if (comparison.kind === 'conflict') {
                await queue.markIssue(operation.operationId, actor, { kind: 'conflict', fields: comparison.fields });
                stopped.add(operation.incidentId);
                issues++;
                continue;
              }
              phase = 'contract';
              const request = {
                actorId: actor,
                path: `/v1/incidents/${encodeURIComponent(operation.incidentId)}/actions`,
                idempotencyKey: operation.operationId,
                body: makeActionBody(operation, remote.version),
                base: remote,
                local: projectOperation(remote, operation),
              };
              if (!active()) break;
              prepared = await queue.prepareRequest(operation.operationId, actor, request);
            }
            if (!active()) break;
            await queue.markSending(operation.operationId, actor);
            if (!active()) break;
            phase = 'network';
            const response = await client.performIncidentAction(operation.incidentId, prepared.body, prepared.idempotencyKey);
            phase = 'contract';
            assertSnapshot(response.incident);
            if (response.operationId !== operation.operationId || response.incident.id !== operation.incidentId ||
                response.incident.version <= prepared.base.version || typeof response.duplicate !== 'boolean') {
              throw new Error('Invalid acknowledgement');
            }
            if (!active()) break;
            await queue.confirm(operation.operationId, actor, response);
            processed++;
          } catch (error: unknown) {
            issues++;
            stopped.add(operation.incidentId);
            const detail = error && typeof error === 'object' ? error as Record<string, unknown> : {};
            const status = typeof detail.status === 'number' ? detail.status : undefined;
            if (detail.dependency) {
              await queue.markIssue(operation.operationId, actor, { kind: 'dependency' });
            } else if (status === 403) {
              await queue.markIssue(operation.operationId, actor, { kind: 'forbidden', httpStatus: 403 });
            } else if (status === 409) {
              let fields: readonly string[] = [];
              try {
                if (!active()) break;
                const remote = await client.getIncidentSnapshot(operation.incidentId);
                const comparison = resolveSync(prepared?.base ?? record.base, prepared?.local ?? record.local, remote);
                if (comparison.kind === 'conflict') fields = comparison.fields;
              } catch { /* Preserve the request for authorized review if remote data is unavailable. */ }
              await queue.markIssue(operation.operationId, actor, { kind: 'conflict', fields, httpStatus: 409 });
            } else {
              const invalid = phase === 'contract' || ['contract', 'decode', 'domain', 'unavailable'].includes(String(detail.kind));
              await queue.markIssue(operation.operationId, actor, {
                kind: invalid ? 'contract' : 'network', ...(status === undefined ? {} : { httpStatus: status }),
              });
              if (status === 401) break; // Session HTTP port already performs bounded refresh.
            }
          }
        }
        return { processed, issues };
      } finally { running = false; }
    },
  };
}
