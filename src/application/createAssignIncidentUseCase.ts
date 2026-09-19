import type { Actor } from '../domain/Actor';
import { canModifyIncident } from '../domain/incidentAuthorization';
import type { Incident } from '../domain/Incident';
import type { IncidentAssignmentPort } from '../domain/IncidentAssignmentPort';
import type { SecurityLogger } from '../domain/SecurityLogger';

export type AssignIncidentResult =
  | { kind: 'denied' }
  | { kind: 'not-found' }
  | { kind: 'assigned'; incident: Incident };

export type AssignIncidentUseCase = Readonly<{
  assign: (actor: Actor, incident: Incident, technicianId: string) => Promise<AssignIncidentResult>;
}>;

export function createAssignIncidentUseCase(
  port: IncidentAssignmentPort,
  logger: SecurityLogger,
): AssignIncidentUseCase {
  return {
    assign: async (actor, incident, technicianId) => {
      const granted = canModifyIncident(actor, incident);
      logger.log({ event: 'incident.assign', incidentId: incident.id, actorRole: actor.role, granted });
      if (!granted) return { kind: 'denied' };
      const updated = await port.assign(incident.id, technicianId);
      return updated === null ? { kind: 'not-found' } : { kind: 'assigned', incident: updated };
    },
  };
}