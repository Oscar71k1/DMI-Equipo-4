import type { Actor } from '../domain/Actor';
import { canAssignIncident } from '../domain/incidentAuthorization';
import type { Incident } from '../domain/Incident';
import type { IncidentAssignmentPort } from '../domain/IncidentAssignmentPort';
import type { SecurityLogger } from '../domain/SecurityLogger';

export type AssignIncidentResult =
  | { kind: 'denied' }
  | { kind: 'not-found' }
  | { kind: 'assigned'; incident: Incident };

export type AssignIncidentUseCase = Readonly<{
  assign: (actor: Actor, incidentId: string, technicianId: string) => Promise<AssignIncidentResult>;
}>;

export function createAssignIncidentUseCase(
  port: IncidentAssignmentPort,
  logger: SecurityLogger,
): AssignIncidentUseCase {
  return {
    assign: async (actor, incidentId, technicianId) => {
      const granted = canAssignIncident(actor);
      logger.log({ event: 'incident.assign', incidentId, actorRole: actor.role, granted });
      if (!granted) return { kind: 'denied' };
      const updated = await port.assign(incidentId, technicianId);
      return updated === null ? { kind: 'not-found' } : { kind: 'assigned', incident: updated };
    },
  };
}
