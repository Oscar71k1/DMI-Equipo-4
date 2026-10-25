import type { PendingIncidentOperation } from '../campusops/contracts';
import type { SyncRecord } from '../course-evaluation/contracts';

export type QueueStatus =
  | 'pendiente'
  | 'enviando'
  | 'confirmada'
  | 'conflicto'
  | 'bloqueada';

export type PreparedActionBody =
  | Readonly<{ action: 'start'; baseVersion: number }>
  | Readonly<{ action: 'comment'; baseVersion: number; text: string }>
  | Readonly<{ action: 'add_evidence'; baseVersion: number; evidenceId: string }>;

export type PreparedRequest = Readonly<{
  actorId: string;
  path: string;
  idempotencyKey: string;
  body: PreparedActionBody;
  base: SyncRecord;
  local: SyncRecord;
}>;

export type IncidentQueueRecord = Readonly<{
  operation: PendingIncidentOperation;
  base: SyncRecord;
  local: SyncRecord;
  sequence: number;
  dependsOn: readonly string[];
  status: QueueStatus;
  preparedRequest: PreparedRequest | null;
  confirmation: Readonly<{
    operationId: string;
    incident: SyncRecord;
    duplicate: boolean;
  }> | null;
  issue: Readonly<{
    kind: 'conflict' | 'forbidden' | 'dependency' | 'network' | 'contract';
    fields?: readonly string[];
    httpStatus?: number;
  }> | null;
}>;

export type ConfirmationAcknowledgement = Readonly<{
  operationId: string;
  incident: SyncRecord;
  duplicate: boolean;
}>;

export interface IncidentQueuePort {
  enqueue(record: IncidentQueueRecord): Promise<void>;
  listPending(actorId: string): Promise<readonly IncidentQueueRecord[]>;
  getRecord(operationId: string, actorId: string): Promise<IncidentQueueRecord | null>;
  getConfirmed(incidentId: string, actorId: string): Promise<SyncRecord | null>;
  prepareRequest(
    operationId: string,
    actorId: string,
    request: PreparedRequest
  ): Promise<PreparedRequest>;
  markSending(operationId: string, actorId: string): Promise<void>;
  markIssue(
    operationId: string,
    actorId: string,
    issue: NonNullable<IncidentQueueRecord['issue']>
  ): Promise<void>;
  confirm(
    operationId: string,
    actorId: string,
    acknowledgement: ConfirmationAcknowledgement
  ): Promise<void>;
  recoverInterrupted(): Promise<void>;
}

/**
 * Función pura que calcula el estado local aplicando una acción sobre la base
 * sin mutar el snapshot original.
 */
export function projectOperation(
  base: SyncRecord,
  operation: PendingIncidentOperation
): SyncRecord {
  const fields: Record<string, unknown> = { ...base.fields };

  if (operation.action === 'start') {
    const currentWork =
      fields.work && typeof fields.work === 'object'
        ? (fields.work as Record<string, unknown>)
        : {};
    fields.work = {
      ...currentWork,
      status: 'in_progress',
    };
  } else if (operation.action === 'comment') {
    const text =
      typeof operation.payload?.text === 'string' ? operation.payload.text : '';
    const currentNotes = Array.isArray(fields.notes) ? [...fields.notes] : [];
    currentNotes.push({ actorId: operation.actorId, text });
    fields.notes = currentNotes;
  } else if (operation.action === 'add_evidence') {
    const evidenceId =
      typeof operation.payload?.evidenceId === 'string'
        ? operation.payload.evidenceId
        : '';
    const currentEvidence = Array.isArray(fields.evidence)
      ? [...fields.evidence]
      : [];
    currentEvidence.push({ actorId: operation.actorId, evidenceId });
    fields.evidence = currentEvidence;
  }

  return {
    id: base.id,
    version: base.version,
    fields,
  };
}