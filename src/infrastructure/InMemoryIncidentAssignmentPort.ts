import type { Incident } from '../domain/Incident';
import type { IncidentAssignmentPort } from '../domain/IncidentAssignmentPort';

/**
 * Almacén compartido de lectura y asignación para probar las políticas locales.
 * No es un servidor ni una integración de autenticación desplegada.
 */
export function createInMemoryIncidentAssignmentPort(
  initialIncidents: readonly Incident[],
): IncidentAssignmentPort {
  const copy = (incident: Incident): Incident => ({
    ...incident,
    location: { ...incident.location },
    work: { ...incident.work },
  });
  const incidents = initialIncidents.map(copy);

  return {
    list: async () => incidents.map(copy),
    getById: async (id) => {
      const found = incidents.find((incident) => incident.id === id);
      return found === undefined ? null : copy(found);
    },
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
      return copy(updated);
    },
  };
}
