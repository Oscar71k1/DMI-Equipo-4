import type { Actor } from '../domain/Actor';
import { canViewIncident } from '../domain/incidentAuthorization';
import type { Incident } from '../domain/Incident';
import type { IncidentRepository } from '../domain/IncidentRepository';
import type { SecurityLogger } from '../domain/SecurityLogger';

export type AuthorizedIncidentQueries = Readonly<{
  listIncidents: (actor: Actor) => Promise<readonly Incident[]>;
  getIncidentDetail: (actor: Actor, id: string) => Promise<Incident | null>;
}>;

export function createAuthorizedIncidentQueries(
  repository: IncidentRepository,
  logger: SecurityLogger,
): AuthorizedIncidentQueries {
  return {
    listIncidents: async (actor) => {
      const incidents = await repository.list();
      return incidents.filter((incident) => {
        const granted = canViewIncident(actor, incident);
        logger.log({ event: 'incident.list', incidentId: incident.id, actorRole: actor.role, granted });
        return granted;
      });
    },
    getIncidentDetail: async (actor, id) => {
      const incident = await repository.getById(id);
      if (incident === null) {
        logger.log({ event: 'incident.view', incidentId: id, actorRole: actor.role, granted: false });
        return null;
      }
      const granted = canViewIncident(actor, incident);
      logger.log({ event: 'incident.view', incidentId: id, actorRole: actor.role, granted });
      // No distinguimos "no existe" de "no autorizado": ambos casos devuelven null,
      // para no filtrar la existencia de una incidencia ajena a quien consulta.
      return granted ? incident : null;
    },
  };
}
