import type { PendingIncidentOperation } from '../campusops/contracts';
export type QueueSyncRecord = Readonly<{ id: string; version: number; fields: Readonly<Record<string, unknown>> }>;
type SyncRecord = QueueSyncRecord;

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
  resolution?: Readonly<{
    decision: 'keep_remote';
    actorId: string;
    decidedAt: string;
    rootOperationId: string;
    remote: SyncRecord | null;
  }>;
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
  assertSnapshot(base);
  makeActionBody(operation, base.version);
  if (base.id !== operation.incidentId || !operation.actorId.trim()) throw new Error('Invalid operation identity');
  const fields: Record<string, unknown> = JSON.parse(JSON.stringify(base.fields));

  if (operation.action === 'start') {
    const currentWork =
      fields.work && typeof fields.work === 'object'
        ? (fields.work as Record<string, unknown>)
        : null;
    if (!currentWork || currentWork.status !== 'assigned' || currentWork.assignedTechnicianId !== operation.actorId) {
      throw new Error('Invalid start transition');
    }
    fields.work = {
      ...currentWork,
      status: 'in_progress',
    };
  } else if (operation.action === 'comment') {
    const text = operation.payload.text;
    if (typeof text !== 'string' || !text.trim() || !Array.isArray(fields.notes)) throw new Error('Invalid note');
    const currentNotes = [...fields.notes];
    currentNotes.push({ actorId: operation.actorId, text });
    fields.notes = currentNotes;
  } else if (operation.action === 'add_evidence') {
    const evidenceId = operation.payload.evidenceId;
    if (typeof evidenceId !== 'string' || !evidenceId.trim() || !Array.isArray(fields.evidence)) throw new Error('Invalid evidence');
    const currentEvidence = [...fields.evidence];
    currentEvidence.push({ actorId: operation.actorId, evidenceId });
    fields.evidence = currentEvidence;
  } else { throw new Error('Unsupported offline action'); }

  return {
    id: base.id,
    version: base.version,
    fields,
  };
}

export function assertSnapshot(value: unknown): asserts value is QueueSyncRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid snapshot');
  const s = value as QueueSyncRecord;
  if (typeof s.id !== 'string' || !s.id.trim() || !Number.isInteger(s.version) || s.version < 0 ||
      !s.fields || typeof s.fields !== 'object' || Array.isArray(s.fields)) throw new Error('Invalid snapshot');
}

export function makeActionBody(operation: PendingIncidentOperation, version: number): PreparedActionBody {
  const allowed = operation.action === 'start' ? [] : operation.action === 'comment' ? ['text'] : ['evidenceId'];
  if (!operation.payload || typeof operation.payload !== 'object' || Array.isArray(operation.payload) ||
      Object.keys(operation.payload).some(key => !allowed.includes(key))) throw new Error('Unexpected action payload');
  if (operation.action === 'start') return { action: 'start', baseVersion: version };
  if (operation.action === 'comment' && typeof operation.payload.text === 'string' && operation.payload.text.trim()) {
    return { action: 'comment', baseVersion: version, text: operation.payload.text };
  }
  if (operation.action === 'add_evidence' && typeof operation.payload.evidenceId === 'string' && operation.payload.evidenceId.trim()) {
    return { action: 'add_evidence', baseVersion: version, evidenceId: operation.payload.evidenceId };
  }
  throw new Error('Invalid offline action');
}
