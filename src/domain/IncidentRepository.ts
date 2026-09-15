import type { Incident } from './Incident';

export interface IncidentRepository {
  list(): Promise<readonly Incident[]>;
  getById(id: string): Promise<Incident | null>;
}