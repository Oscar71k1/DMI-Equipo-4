import type { PendingIncidentOperation } from '../campusops/contracts';

// Misma forma estructural que SyncRecord de src/course-evaluation/contracts.ts.
// Se define aqui para que domain no dependa de esa carpeta.
export type QueueSyncRecord = Readonly<{
  id: string;
  version: number;
  fields: Readonly<Record<string, unknown>>;
}>;

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
  base: QueueSyncRecord;
  local: QueueSyncRecord;
}>;

export type QueueIssue = Readonly<{
  kind: 'conflict' | 'forbidden' | 'dependency' | 'network' | 'contract';
  fields?: readonly string[];
  httpStatus?: number;
}>;

export type QueueConfirmation = Readonly<{
  operationId: string;
  incident: QueueSyncRecord;
  duplicate: boolean;
}>;

export type IncidentQueueRecord = Readonly<{
  operation: PendingIncidentOperation;
  base: QueueSyncRecord;
  local: QueueSyncRecord;
  sequence: number;
  dependsOn: readonly string[];
  status: QueueStatus;
  preparedRequest: PreparedRequest | null;
  confirmation: QueueConfirmation | null;
  issue: QueueIssue | null;
}>;