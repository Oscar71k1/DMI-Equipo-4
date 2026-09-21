import type { Actor } from './Actor';
import type { Incident } from './Incident';

/**
 * Política de autorización pura: no conoce React, HTTP ni almacenamiento.
 * - Coordinador: puede consultar y modificar (asignar/reasignar) cualquier incidencia.
 * - Técnico: solo puede consultar y modificar la incidencia que tiene asignada.
 * - Reportante: puede consultar (alcance mínimo de esta semana); no puede modificar.
 */
export function canViewIncident(actor: Actor, incident: Incident): boolean {
  if (actor.role === 'coordinator') return true;
  if (actor.role === 'technician') return incident.work.assignedTechnicianId === actor.id;
  return actor.role === 'reporter';
}

export function canModifyIncident(actor: Actor, incident: Incident): boolean {
  if (actor.role === 'coordinator') return true;
  if (actor.role === 'technician') return incident.work.assignedTechnicianId === actor.id;
  return false;
}