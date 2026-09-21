import type { Actor } from './Actor';
import type { Incident } from './Incident';

/**
 * Política de autorización pura: no conoce React, HTTP ni almacenamiento.
 * - Coordinador: puede consultar, reasignar y actualizar progreso.
 * - Técnico: consulta y actualiza progreso de su asignación; no reasigna.
 * - Reportante: consulta únicamente sus propios reportes; no modifica.
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
