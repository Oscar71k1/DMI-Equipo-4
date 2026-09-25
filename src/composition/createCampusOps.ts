import type { CampusOpsActions } from '../application/CampusOpsActions';
import { createAuthorizedIncidentQueries } from '../application/createAuthorizedIncidentQueries';
import { createHealthQuery } from '../application/createHealthQuery';
import type { Actor } from '../domain/Actor';
import { createCourseBackendHealthAdapter } from '../infrastructure/CourseBackendHealthAdapter';
import { createInMemoryIncidentRepository } from '../infrastructure/InMemoryIncidentRepository';
import { createInMemorySecurityLogger } from '../infrastructure/InMemorySecurityLogger';

export function createCampusOps(): CampusOpsActions {
  const incidentRepository = createInMemoryIncidentRepository();
  const healthPort = createCourseBackendHealthAdapter();

  // Identidad de demostración local. No constituye una sesión autenticada.
  const actor: Actor = { id: 'reporter-1', role: 'reporter' };
  const incidentQueries = createAuthorizedIncidentQueries(
    incidentRepository, createInMemorySecurityLogger(),
  );
  const healthQuery = createHealthQuery(healthPort);

  return {
    listIncidents: () => incidentQueries.listIncidents(actor),
    getIncidentDetail: (id) => incidentQueries.getIncidentDetail(actor, id),
    checkHealth: healthQuery.checkHealth,
  };
}
