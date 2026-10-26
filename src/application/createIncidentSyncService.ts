import type {
  IncidentQueuePort,
  PreparedRequest,
  PreparedActionBody,
} from '../domain/IncidentQueueRecord';
import { projectOperation } from '../domain/IncidentQueueRecord';
import { deduplicateOperations } from '../domain/deduplicateOperations';
import { resolveSync } from '../domain/incidentSync';

export interface IncidentActionClient {
  performIncidentAction(
    incidentId: string,
    input: Record<string, unknown>,
    idempotencyKey: string
  ): Promise<{
    operationId: string;
    incident: unknown;
    duplicate: boolean;
  }>;
}

export type SyncServiceOptions = {
  queuePort: IncidentQueuePort;
  incidentClient: IncidentActionClient;
  getCurrentActor: () => string | null;
  onRefreshSession?: () => Promise<boolean>;
};

export function createIncidentSyncService(options: SyncServiceOptions) {
  const { queuePort, incidentClient, getCurrentActor, onRefreshSession } = options;
  let isSyncing = false;

  return {
    async syncPending(): Promise<{ processed: number; issues: number }> {
      if (isSyncing) {
        return { processed: 0, issues: 0 };
      }

      const actorId = getCurrentActor();
      if (!actorId) {
        return { processed: 0, issues: 0 };
      }

      isSyncing = true;
      let processedCount = 0;
      let issuesCount = 0;

      try {
        await queuePort.recoverInterrupted();

        const pendingRecords = await queuePort.listPending(actorId);
        if (pendingRecords.length === 0) {
          return { processed: 0, issues: 0 };
        }

        const uniqueOps = deduplicateOperations(
          pendingRecords.map((r) => r.operation)
        );
        const uniqueOpIds = new Set(uniqueOps.map((o) => o.operationId));
        const activeRecords = pendingRecords.filter((r) =>
          uniqueOpIds.has(r.operation.operationId)
        );

        for (const record of activeRecords) {
          if (getCurrentActor() !== actorId) {
            break;
          }

          if (record.dependsOn.length > 0) {
            let hasUnresolvedDependency = false;
            for (const depId of record.dependsOn) {
              const depRecord = await queuePort.getRecord(depId, actorId);
              if (!depRecord || depRecord.status !== 'confirmada') {
                hasUnresolvedDependency = true;
                break;
              }
            }
            if (hasUnresolvedDependency) {
              await queuePort.markIssue(record.operation.operationId, actorId, {
                kind: 'dependency',
              });
              issuesCount++;
              continue;
            }
          }

          let prepared = record.preparedRequest;
          if (!prepared) {
            const confirmedBase =
              (await queuePort.getConfirmed(record.operation.incidentId, actorId)) ??
              record.base;
            const projectedLocal = projectOperation(confirmedBase, record.operation);

            let body: PreparedActionBody;
            if (record.operation.action === 'start') {
              body = { action: 'start', baseVersion: confirmedBase.version };
            } else if (record.operation.action === 'comment') {
              body = {
                action: 'comment',
                baseVersion: confirmedBase.version,
                text: String(record.operation.payload?.text ?? ''),
              };
            } else if (record.operation.action === 'add_evidence') {
              body = {
                action: 'add_evidence',
                baseVersion: confirmedBase.version,
                evidenceId: String(record.operation.payload?.evidenceId ?? ''),
              };
            } else {
              continue;
            }

            const requestToPrepare: PreparedRequest = {
              actorId,
              path: `/v1/incidents/${record.operation.incidentId}/actions`,
              idempotencyKey: record.operation.operationId,
              body,
              base: confirmedBase,
              local: projectedLocal,
            };

            prepared = await queuePort.prepareRequest(
              record.operation.operationId,
              actorId,
              requestToPrepare
            );
          }

          await queuePort.markSending(record.operation.operationId, actorId);

          try {
            const response = await incidentClient.performIncidentAction(
              record.operation.incidentId,
              prepared.body as unknown as Record<string, unknown>,
              prepared.idempotencyKey
            );

            const confirmedIncidentDto = response.incident as
              | { kind: 'unavailable'; id: string }
              | { kind: 'available'; incident: { id: string; version: number; payload: Record<string, unknown> } };

            const confirmedRecord = {
              id:
                confirmedIncidentDto.kind === 'unavailable'
                  ? confirmedIncidentDto.id
                  : confirmedIncidentDto.incident.id,
              version:
                confirmedIncidentDto.kind === 'unavailable'
                  ? 0
                  : confirmedIncidentDto.incident.version ?? 1,
              fields:
                confirmedIncidentDto.kind === 'unavailable'
                  ? {}
                  : confirmedIncidentDto.incident.payload ?? {},
            };

            await queuePort.confirm(record.operation.operationId, actorId, {
              operationId: response.operationId,
              incident: confirmedRecord,
              duplicate: response.duplicate,
            });

            processedCount++;
          } catch (error: unknown) {
            issuesCount++;
            const httpStatus =
              error && typeof error === 'object' && 'status' in error
                ? Number((error as { status: unknown }).status)
                : undefined;

            if (httpStatus === 401 && onRefreshSession) {
              const refreshed = await onRefreshSession();
              if (!refreshed) {
                break;
              }
            } else if (httpStatus === 403) {
              await queuePort.markIssue(record.operation.operationId, actorId, {
                kind: 'forbidden',
                httpStatus: 403,
              });
            } else if (httpStatus === 409) {
              const syncComparison = resolveSync(
                prepared.base,
                prepared.local,
                prepared.base
              );
              const conflictFields =
                syncComparison.kind === 'conflict' ? syncComparison.fields : ['work'];

              await queuePort.markIssue(record.operation.operationId, actorId, {
                kind: 'conflict',
                fields: conflictFields,
                httpStatus: 409,
              });
            } else {
              await queuePort.markIssue(record.operation.operationId, actorId, {
                kind: 'network',
                ...(httpStatus !== undefined ? { httpStatus } : {}),
              });
            }
          }
        }

        return { processed: processedCount, issues: issuesCount };
      } finally {
        isSyncing = false;
      }
    },
  };
}