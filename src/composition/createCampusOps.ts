import type { CampusOpsActions } from '../application/CampusOpsActions';
import { createAuthorizedIncidentQueries } from '../application/createAuthorizedIncidentQueries';
import { createHealthQuery } from '../application/createHealthQuery';
import { createSessionStore } from '../application/createSessionStore';
import { createExpoSecureTokenStorage } from '../infrastructure/ExpoSecureTokenStorage';
import type { Actor } from '../domain/Actor';
import { createCourseBackendHealthAdapter } from '../infrastructure/CourseBackendHealthAdapter';
import { createRemoteIncidentRepository } from '../infrastructure/RemoteIncidentRepository';
import { createInMemorySecurityLogger } from '../infrastructure/InMemorySecurityLogger';

export function createCampusOps(): CampusOpsActions {
  const logger = createInMemorySecurityLogger();
  const session = createSessionStore({
    secureStorage: createExpoSecureTokenStorage(),
    log: () => logger.log({ event: 'session-storage-error', incidentId: '', actorRole: 'demo', granted: false }),
  });
  const incidentRepository = createRemoteIncidentRepository();
  const healthPort = createCourseBackendHealthAdapter();

  // Identidad de demostración local. No constituye una sesión autenticada.
  const actor: Actor = { id: 'reporter-1', role: 'reporter' };
  const incidentQueries = createAuthorizedIncidentQueries(
    incidentRepository, logger,
  );
  const healthQuery = createHealthQuery(healthPort);

  return {
    session,
    listIncidents: () => incidentQueries.listIncidents(actor),
    getIncidentDetail: (id) => incidentQueries.getIncidentDetail(actor, id),
    createIncident: async (input, idempotencyKey) => {
      if (!incidentRepository.create) throw new Error('Incident creation is unavailable');
      return incidentRepository.create(input, idempotencyKey);
    },
    checkHealth: healthQuery.checkHealth,
  };
}
