import type { Incident } from '../domain/Incident';
import type { IncidentRepository } from '../domain/IncidentRepository';

export type IncidentQueries = Readonly<{
  listIncidents: () => Promise<readonly Incident[]>;
  getIncidentDetail: (id: string) => Promise<Incident | null>;
}>;

export function createIncidentQueries(repository: IncidentRepository): IncidentQueries {
  return {
    listIncidents: () => repository.list(),
    getIncidentDetail: (id: string) => repository.getById(id),
  };
}