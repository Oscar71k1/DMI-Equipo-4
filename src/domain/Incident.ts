import type {
  IncidentCategory,
  IncidentLocation,
  IncidentStatus,
  IncidentWork,
} from '../campusops/contracts';

export type Incident = Readonly<{
  id: string;
  reporterId: string;
  category: IncidentCategory;
  description: string;
  location: IncidentLocation;
  status: IncidentStatus;
  work: IncidentWork;
}>;
