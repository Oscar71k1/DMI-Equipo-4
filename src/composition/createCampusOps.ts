import type { CampusOpsActions } from '../application/CampusOpsActions';
import { createHealthQuery } from '../application/createHealthQuery';
import { createIncidentQueries } from '../application/createIncidentQueries';
import { createCourseBackendHealthAdapter } from '../infrastructure/CourseBackendHealthAdapter';
import { createInMemoryIncidentRepository } from '../infrastructure/InMemoryIncidentRepository';

export function createCampusOps(): CampusOpsActions {
  const incidentRepository = createInMemoryIncidentRepository();
  const healthPort = createCourseBackendHealthAdapter();

  const incidentQueries = createIncidentQueries(incidentRepository);
  const healthQuery = createHealthQuery(healthPort);

  return {
    listIncidents: incidentQueries.listIncidents,
    getIncidentDetail: incidentQueries.getIncidentDetail,
    checkHealth: healthQuery.checkHealth,
  };
}