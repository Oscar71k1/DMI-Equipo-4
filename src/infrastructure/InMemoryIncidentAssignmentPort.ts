import type { Incident } from '../domain/Incident';
import type { IncidentAssignmentPort } from '../domain/IncidentAssignmentPort';

/**
 * Fake aislado para probar la política de autorización de asignación.
 * No está conectado al repositorio real de lectura ni a un servidor:
 * demuestra la regla de autorización, no una integración desplegada.
 */
export function createInMemoryIncidentAssignmentPort(
  initialIncidents: readonly Incident[],
): IncidentAssignmentPort {
  const incidents = [...initialIncidents];

  return {
    assign: async (incidentId, technicianId) => {
      const index = incidents.findIndex((incident) => incident.id === incidentId);
      if (index === -1) return null;
      const current = incidents[index];
      if (current === undefined) return null;
      const updated: Incident = {
        ...current,
        work: { assignedTechnicianId: technicianId, status: current.work.status },
      };
      incidents[index] = updated;
      return updated;
    },
  };
}