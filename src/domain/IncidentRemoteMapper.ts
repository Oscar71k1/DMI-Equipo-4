import type { IncidentCategory, IncidentLocation, IncidentStatus, IncidentWork } from '../campusops/contracts';
import type { Incident } from './Incident';

export type IncidentMapResult =
  | Readonly<{ ok: true; value: Incident }>
  | Readonly<{ ok: false; error: 'domain' }>;

const VALID_CATEGORIES: readonly IncidentCategory[] = [
  'electrical', 'laboratory', 'water', 'connectivity', 'equipment', 'safety', 'maintenance',
];
const VALID_STATUSES: readonly IncidentStatus[] = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

function isCategory(value: unknown): value is IncidentCategory {
  return typeof value === 'string' && (VALID_CATEGORIES as readonly string[]).includes(value);
}
function isStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}
function isLocation(value: unknown): value is IncidentLocation {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (v.source === 'provider' || v.source === 'manual') && typeof v.label === 'string' && v.label.trim().length > 0;
}
function isWork(value: unknown): value is IncidentWork {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (v.assignedTechnicianId === null || typeof v.assignedTechnicianId === 'string') && isStatus(v.status);
}

export function mapRemoteIncidentToDomain(resource: Readonly<{
  id: string;
  status: string;
  payload: Record<string, unknown> | null;
}>): IncidentMapResult {
  const payload = resource.payload;
  if (payload === null) return { ok: false, error: 'domain' };
  if (typeof payload.reporterId !== 'string' || payload.reporterId.trim().length === 0) {
    return { ok: false, error: 'domain' };
  }
  if (!isCategory(payload.category)) return { ok: false, error: 'domain' };
  if (typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    return { ok: false, error: 'domain' };
  }
  if (!isLocation(payload.location)) return { ok: false, error: 'domain' };
  if (!isStatus(resource.status)) return { ok: false, error: 'domain' };
  const assignedTechnicianId = payload.assignedTechnicianId;
  const rawWork = payload.work ?? {
    assignedTechnicianId,
    status: resource.status,
  };
  if (!isWork(rawWork) || rawWork.status !== resource.status) return { ok: false, error: 'domain' };
  if (!(assignedTechnicianId === undefined || assignedTechnicianId === null || (typeof assignedTechnicianId === 'string' && assignedTechnicianId.trim().length > 0))) {
    return { ok: false, error: 'domain' };
  }

  const location: IncidentLocation = typeof payload.location === 'string'
    ? { source: 'manual', label: payload.location }
    : payload.location;
  const work: IncidentWork = rawWork;

  return {
    ok: true,
    value: {
      id: resource.id,
      reporterId: payload.reporterId,
      category: payload.category,
      description: payload.description,
      location,
      status: resource.status,
      work,
    },
  };
}
