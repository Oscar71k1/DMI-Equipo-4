import type { Incident } from './Incident';
import type { IncidentRepository } from './IncidentRepository';

export interface IncidentAssignmentPort extends IncidentRepository {
  assign(incidentId: string, technicianId: string): Promise<Incident | null>;
}
