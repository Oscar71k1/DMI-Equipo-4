import type { Incident } from '../domain/Incident';
import type { IncidentRepository } from '../domain/IncidentRepository';

const defaultIncidents: readonly Incident[] = [
  {
    id: 'inc-001',
    reporterId: 'reporter-1',
    category: 'electrical',
    description: 'Apagón intermitente en el laboratorio de Redes.',
    location: { source: 'manual', label: 'Edificio B, Laboratorio de Redes' },
    status: 'open',
    work: { assignedTechnicianId: null, status: 'open' },
  },
  {
    id: 'inc-002',
    reporterId: 'reporter-2',
    category: 'water',
    description: 'Fuga de agua cerca de los servidores del laboratorio de Software.',
    location: {
      source: 'manual',
      label: 'Edificio C, Laboratorio de Software',
    },
    status: 'assigned',
    work: { assignedTechnicianId: 'tech-07', status: 'assigned' },
  },
  {
    id: 'inc-003',
    reporterId: 'reporter-3',
    category: 'equipment',
    description: 'Proyector del laboratorio de Electrónica no enciende.',
    location: {
      source: 'manual',
      label: 'Edificio A, Laboratorio de Electrónica',
    },
    status: 'in_progress',
    work: { assignedTechnicianId: 'tech-03', status: 'in_progress' },
  },
];

export function createInMemoryIncidentRepository(
  initialIncidents: readonly Incident[] = defaultIncidents,
): IncidentRepository {
  const copyIncident = (incident: Incident): Incident => ({
    ...incident,
    location: { ...incident.location },
    work: { ...incident.work },
  });
  const incidents = initialIncidents.map(copyIncident);

  return {
    list: () => Promise.resolve(incidents.map(copyIncident)),
    getById: (id: string) => {
      const found = incidents.find((incident) => incident.id === id) ?? null;
      return Promise.resolve(found === null ? null : copyIncident(found));
    },
  };
}
