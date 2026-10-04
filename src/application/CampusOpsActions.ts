import type { Incident } from '../domain/Incident';
import type { BackendHealthStatus } from './createHealthQuery';
import type { SessionStore } from './createSessionStore';

export type CampusOpsActions = Readonly<{
  session?: SessionStore;
  listIncidents: () => Promise<readonly Incident[]>;
  getIncidentDetail: (id: string) => Promise<Incident | null>;
  createIncident?: (input: Readonly<{ category: string; description: string; location: string }>, idempotencyKey: string) => Promise<Incident>;
  checkHealth: () => Promise<BackendHealthStatus>;
}>;
