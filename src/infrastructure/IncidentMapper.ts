import type { Incident } from '../domain/Incident';
import type { QueueSyncRecord } from '../domain/IncidentQueueRecord';
import type { ParseResult } from '../course-evaluation/contracts';
import { parseRemoteResource } from '../course-evaluation';
import { mapRemoteIncidentToDomain } from '../domain/IncidentRemoteMapper';

export type RemoteIncident = NonNullable<ParseResult extends { ok: true; value: infer T } ? T : never>;
export type IncidentMapping =
  | Readonly<{ kind: 'mapped'; incident: Incident; version: number }>
  | Readonly<{ kind: 'unavailable'; id: string; status: string; version: number }>;

export class IncidentMappingError extends Error {
  readonly kind: 'contract' | 'domain';
  constructor(kind: 'contract' | 'domain') {
    super(`Remote incident ${kind} invalid`);
    this.name = 'IncidentMappingError';
    this.kind = kind;
  }
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function mapRemoteIncident(input: unknown): IncidentMapping {
  const parsed = parseRemoteResource(input);
  if (!parsed.ok) throw new IncidentMappingError('contract');
  const { id, version, status, payload } = parsed.value;
  if (payload === null) return { kind: 'unavailable', id, status, version };
  const mapped = mapRemoteIncidentToDomain(parsed.value);
  if (!mapped.ok) throw new IncidentMappingError('domain');
  return {
    kind: 'mapped',
    version,
    incident: mapped.value,
  };
}

export function parseIncidentList(input: unknown): readonly IncidentMapping[] {
  if (typeof input !== 'object' || input === null || Array.isArray(input) || !('items' in input) || !Array.isArray(input.items)) {
    throw new Error('Remote incident list contract invalid');
  }
  return input.items.map(mapRemoteIncident);
}

export function parseIncidentCreate(input: unknown): Readonly<{ incident: IncidentMapping; operationId: string; duplicate: boolean }> {
  if (
    typeof input !== 'object' || input === null || Array.isArray(input) ||
    !('incident' in input) || !('operationId' in input) || !nonempty(input.operationId) ||
    !('duplicate' in input) || typeof input.duplicate !== 'boolean'
  ) throw new Error('Remote incident creation contract invalid');
  return { incident: mapRemoteIncident(input.incident), operationId: input.operationId, duplicate: input.duplicate };
}

/** Keep synchronization metadata before the display-domain mapper discards it. */
export function mapQueueSnapshot(input: unknown): QueueSyncRecord {
  const mapped = mapRemoteIncident(input);
  const parsed = parseRemoteResource(input);
  if (mapped.kind !== 'mapped' || !parsed.ok || !parsed.value.payload) throw new IncidentMappingError('contract');
  const payload = parsed.value.payload;
  if (!Array.isArray(payload.notes) || !Array.isArray(payload.evidence) ||
      !payload.notes.every(n => n && typeof n === 'object' && typeof n.actorId === 'string' && typeof n.text === 'string') ||
      !payload.evidence.every(e => e && typeof e === 'object' && typeof e.actorId === 'string' && typeof e.evidenceId === 'string')) {
    throw new IncidentMappingError('contract');
  }
  const { history: _history, assignedTechnicianId: _assigned, work: _work, ...fields } = payload;
  return JSON.parse(JSON.stringify({
    id: parsed.value.id, version: parsed.value.version,
    fields: { ...fields, work: mapped.incident.work },
  })) as QueueSyncRecord;
}
