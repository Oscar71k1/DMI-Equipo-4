import type { CampusOpsActions } from '../application/CampusOpsActions';
import { createAuthorizedIncidentQueries } from '../application/createAuthorizedIncidentQueries';
import { createHealthQuery } from '../application/createHealthQuery';
import { createSessionStore } from '../application/createSessionStore';
import { createSessionCoordinator } from '../application/createSessionCoordinator';
import { createAuthorizedIncidentAction } from '../application/createAuthorizedIncidentAction';
import { canCreateIncident } from '../domain/incidentAuthorization';
import { createExpoSecureTokenStorage } from '../infrastructure/ExpoSecureTokenStorage';
import type { Actor } from '../domain/Actor';
import { createCourseBackendHealthAdapter } from '../infrastructure/CourseBackendHealthAdapter';
import { createRemoteIncidentRepository } from '../infrastructure/RemoteIncidentRepository';
import { createInMemorySecurityLogger } from '../infrastructure/InMemorySecurityLogger';
import { createCourseSessionAdapter } from '../infrastructure/CourseSessionAdapter';
import { IncidentClientError } from '../api/incidentClient';

export function createCampusOps(): CampusOpsActions {
  const logger = createInMemorySecurityLogger();
  const session = createSessionStore({
    secureStorage: createExpoSecureTokenStorage(),
    log: () => logger.log({ event: 'session-storage-error', incidentId: '', actorRole: 'demo', granted: false }),
  });
  const sessionAdapter = createCourseSessionAdapter();
  const auth = createSessionCoordinator({
    refreshPort: sessionAdapter,
    loginPort: sessionAdapter,
    store: session,
    clock: { now: Date.now },
    log: (entry) => logger.log({
      event: String(entry.event ?? 'session-event'),
      incidentId: '',
      actorRole: 'session',
      granted: false,
    }),
  });
  const incidentRepository = createRemoteIncidentRepository({ session: auth });
  const healthPort = createCourseBackendHealthAdapter();

  const incidentQueries = createAuthorizedIncidentQueries(
    incidentRepository, logger,
  );
  const authorizedAction = createAuthorizedIncidentAction(incidentRepository, logger);
  const currentActor = (): Actor => {
    const identity = auth.snapshot().identity;
    if (!identity) throw new IncidentClientError('http', 401);
    return { id: identity.actorId, role: identity.role };
  };
  const healthQuery = createHealthQuery(healthPort);

  return {
    session,
    auth,
    listIncidents: () => incidentQueries.listIncidents(currentActor()),
    getIncidentDetail: (id) => incidentQueries.getIncidentDetail(currentActor(), id),
    createIncident: async (input, idempotencyKey) => {
      const actor = currentActor();
      if (!canCreateIncident(actor)) throw new IncidentClientError('http', 403);
      if (!incidentRepository.create) throw new Error('Incident creation is unavailable');
      return incidentRepository.create(input, idempotencyKey);
    },
    performIncidentAction: (incidentId, input, idempotencyKey) =>
      authorizedAction(currentActor(), incidentId, input, idempotencyKey),
    checkHealth: healthQuery.checkHealth,
  };
}
