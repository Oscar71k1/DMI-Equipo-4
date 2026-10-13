import type { Actor } from './Actor';
import type { Incident } from './Incident';

/**
 * Política de autorización pura: no conoce React, HTTP ni almacenamiento.
 * - Coordinador: puede consultar todo y asignar, priorizar, cerrar o reabrir.
 * - Técnico: consulta y resuelve únicamente su asignación.
 * - Reportante: consulta sus reportes y puede crear incidencias.
 */
export function canViewIncident(actor: Actor, incident: Incident): boolean {
  if (actor.role === 'coordinator') return true;
  if (actor.role === 'technician') return incident.work.assignedTechnicianId === actor.id;
  return actor.role === 'reporter' && incident.reporterId === actor.id;
}

export function canAssignIncident(actor: Actor): boolean {
  return actor.role === 'coordinator';
}

// Política para progreso, nunca para conceder el permiso de reasignación.
export function canModifyIncident(actor: Actor, incident: Incident): boolean {
  if (actor.role === 'coordinator') return true;
  if (actor.role === 'technician') return incident.work.assignedTechnicianId === actor.id;
  return false;
}

export type IncidentAction =
  | 'assign' | 'prioritize' | 'start' | 'resolve' | 'close' | 'reopen' | 'comment' | 'add_evidence';

export function canCreateIncident(actor: Actor): boolean {
  return actor.role === 'reporter';
}

export function canPrioritizeIncident(actor: Actor): boolean {
  return actor.role === 'coordinator';
}

export function canCloseIncident(actor: Actor): boolean {
  return actor.role === 'coordinator';
}

export function canReopenIncident(actor: Actor): boolean {
  return actor.role === 'coordinator';
}

export function canStartIncident(actor: Actor, incident: Incident): boolean {
  return actor.role === 'technician' && incident.work.assignedTechnicianId === actor.id;
}

export function canResolveIncident(actor: Actor, incident: Incident): boolean {
  return canStartIncident(actor, incident);
}

export function canAnnotateIncident(actor: Actor, incident: Incident): boolean {
  return canViewIncident(actor, incident);
}

export function canPerformIncidentAction(actor: Actor, incident: Incident, action: IncidentAction): boolean {
  switch (action) {
    case 'assign':
      return actor.role === 'coordinator';
    case 'prioritize':
      return canPrioritizeIncident(actor);
    case 'close':
      return canCloseIncident(actor);
    case 'reopen':
      return canReopenIncident(actor);
    case 'start':
      return canStartIncident(actor, incident);
    case 'resolve':
      return canResolveIncident(actor, incident);
    case 'comment':
    case 'add_evidence':
      return canAnnotateIncident(actor, incident);
  }
}
