import type { Incident } from '../domain/Incident';
import type { BackendHealthStatus } from './createHealthQuery';
import type { SessionStore } from './createSessionStore';
import type { SessionCoordinator } from './createSessionCoordinator';
import type { IncidentActionRequest, AuthorizedActionResult } from './createAuthorizedIncidentAction';

export type CampusOpsActions = Readonly<{
  session?: SessionStore;
  auth?: SessionCoordinator;
  listIncidents: () => Promise<readonly Incident[]>;
  getIncidentDetail: (id: string) => Promise<Incident | null>;
  createIncident?: (
    input: Readonly<{
      category: string;
      description: string;
      location: string;
    }>,
    idempotencyKey: string,
  ) => Promise<Incident>;
  performIncidentAction?: (
    incidentId: string,
    input: IncidentActionRequest,
    idempotencyKey: string,
  ) => Promise<AuthorizedActionResult>;
  checkHealth: () => Promise<BackendHealthStatus>;
}>;
