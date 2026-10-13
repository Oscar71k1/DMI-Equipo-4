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

// --- Semana 6: politica por accion ---
// Fuente: course-backend/campusops.mjs y docs/CAMPUSOPS.md.
// Solo cubre permisos por rol y asignacion. Las transiciones de estado
// (por ejemplo, resolver solo desde in_progress) las valida el servidor.

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

// Iniciar y resolver son del tecnico asignado; la coordinacion no los ejecuta.
export function canStartIncident(actor: Actor, incident: Incident): boolean {
  return actor.role === 'technician' && incident.work.assignedTechnicianId === actor.id;
}

export function canResolveIncident(actor: Actor, incident: Incident): boolean {
  return actor.role === 'technician' && incident.work.assignedTechnicianId === actor.id;
}

// Comentar y agregar evidencia: quien puede ver la incidencia.
export function canAnnotateIncident(actor: Actor, incident: Incident): boolean {
  return canViewIncident(actor, incident);
}
