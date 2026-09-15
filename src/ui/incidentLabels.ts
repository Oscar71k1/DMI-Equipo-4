import type { IncidentCategory, IncidentStatus } from '../campusops/contracts';

export const incidentCategoryLabels: Readonly<Record<IncidentCategory, string>> = {
  electrical: 'Electricidad',
  laboratory: 'Laboratorio',
  water: 'Agua',
  connectivity: 'Conectividad',
  equipment: 'Equipo',
  safety: 'Seguridad',
  maintenance: 'Mantenimiento',
};

export const incidentStatusLabels: Readonly<Record<IncidentStatus, string>> = {
  open: 'Abierta',
  assigned: 'Asignada',
  in_progress: 'En proceso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};
