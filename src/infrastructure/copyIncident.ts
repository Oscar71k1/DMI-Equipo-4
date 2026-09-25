import type { Incident } from '../domain/Incident';

/** Conserva únicamente los campos del contrato, también en los objetos anidados. */
export function copyIncident(incident: Incident): Incident {
  return {
    id: incident.id,
    reporterId: incident.reporterId,
    category: incident.category,
    description: incident.description,
    location: {
      source: incident.location.source,
      label: incident.location.label,
      ...(incident.location.latitude === undefined ? {} : { latitude: incident.location.latitude }),
      ...(incident.location.longitude === undefined ? {} : { longitude: incident.location.longitude }),
    },
    status: incident.status,
    work: {
      assignedTechnicianId: incident.work.assignedTechnicianId,
      status: incident.work.status,
    },
  };
}
