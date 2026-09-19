import type { Incident } from './Incident';

export interface IncidentAssignmentPort {
  assign(incidentId: string, technicianId: string): Promise<Incident | null>;
}