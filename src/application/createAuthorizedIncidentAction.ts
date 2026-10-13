import type { Actor } from '../domain/Actor';
import type { Incident } from '../domain/Incident';
import type { IncidentAction } from '../domain/incidentAuthorization';
import { canPerformIncidentAction } from '../domain/incidentAuthorization';
import type { IncidentRepository } from '../domain/IncidentRepository';
import type { SecurityLogger } from '../domain/SecurityLogger';

export type IncidentActionRequest = Readonly<{
  action: IncidentAction;
  baseVersion: number;
  technicianId?: string;
  priority?: 'low' | 'medium' | 'high';
  diagnosis?: string;
  text?: string;
  evidenceId?: string;
}>;

export type AuthorizedActionResult =
  | Readonly<{ kind: 'denied' }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'updated'; incident: Incident }>;

export function createAuthorizedIncidentAction(repository: IncidentRepository, logger: SecurityLogger) {
  return async (
    actor: Actor,
    incidentId: string,
    input: IncidentActionRequest,
    idempotencyKey: string,
  ): Promise<AuthorizedActionResult> => {
    const incident = await repository.getById(incidentId);
    if (!incident) return { kind: 'not-found' };
    const granted = canPerformIncidentAction(actor, incident, input.action);
    logger.log({ event: `incident.${input.action}`, incidentId, actorRole: actor.role, granted });
    if (!granted) return { kind: 'denied' };
    if (!repository.performAction) return { kind: 'unavailable' };
    const updated = await repository.performAction(incidentId, input, idempotencyKey);
    return { kind: 'updated', incident: updated };
  };
}
