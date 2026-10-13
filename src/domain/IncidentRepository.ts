import type { Incident } from './Incident';
import type { IncidentAction } from './incidentAuthorization';

export interface IncidentRepository {
  list(): Promise<readonly Incident[]>;
  getById(id: string): Promise<Incident | null>;
  create?(input: Readonly<{ category: string; description: string; location: string }>, idempotencyKey: string): Promise<Incident>;
  performAction?(
    incidentId: string,
    input: Readonly<{ action: IncidentAction; baseVersion: number; [key: string]: unknown }>,
    idempotencyKey: string,
  ): Promise<Incident>;
}
