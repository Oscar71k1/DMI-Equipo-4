import type { Incident } from '../domain/Incident';
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
