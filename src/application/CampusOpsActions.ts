import type { Incident } from '../domain/Incident';
import type { BackendHealthStatus } from './createHealthQuery';

export type CampusOpsActions = Readonly<{
  listIncidents: () => Promise<readonly Incident[]>;
  getIncidentDetail: (id: string) => Promise<Incident | null>;
  checkHealth: () => Promise<BackendHealthStatus>;
}>;