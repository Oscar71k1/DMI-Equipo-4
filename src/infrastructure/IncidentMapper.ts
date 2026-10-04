import type { Incident } from '../domain/Incident';
import type { IncidentCategory, IncidentStatus } from '../campusops/contracts';
import type { ParseResult } from '../course-evaluation/contracts';
import { parseRemoteResource } from '../course-evaluation';

export type RemoteIncident = NonNullable<ParseResult extends { ok: true; value: infer T } ? T : never>;
export type IncidentMapping =
  | Readonly<{ kind: 'mapped'; incident: Incident; version: number }>
  | Readonly<{ kind: 'unavailable'; id: string; status: string; version: number }>;

const categories = new Set<IncidentCategory>([
  'electrical', 'laboratory', 'water', 'connectivity', 'equipment', 'safety', 'maintenance',
]);
const statuses = new Set<IncidentStatus>(['open', 'assigned', 'in_progress', 'resolved', 'closed']);

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function mapRemoteIncident(input: unknown): IncidentMapping {
  const parsed = parseRemoteResource(input);
  if (!parsed.ok) throw new Error('Remote incident contract invalid');
  const { id, version, status, payload } = parsed.value;
  if (payload === null) return { kind: 'unavailable', id, status, version };

  const category = payload.category;
  const description = payload.description;
  const location = payload.location;
  const reporterId = payload.reporterId;
  const assigned = payload.assignedTechnicianId;
  if (
    !statuses.has(status as IncidentStatus) || !categories.has(category as IncidentCategory) ||
    !nonempty(description) || !nonempty(location) || !nonempty(reporterId) ||
    !(assigned === null || nonempty(assigned))
  ) {
    throw new Error('Remote incident domain data invalid');
  }

  const incidentStatus = status as IncidentStatus;
  return {
    kind: 'mapped',
    version,
    incident: {
      id,
      reporterId,
      category: category as IncidentCategory,
      description,
      location: { source: 'manual', label: location },
      status: incidentStatus,
      work: { assignedTechnicianId: assigned, status: incidentStatus },
    },
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
