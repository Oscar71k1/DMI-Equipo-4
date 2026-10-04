import type { Incident } from './Incident';

export interface IncidentRepository {
  list(): Promise<readonly Incident[]>;
  getById(id: string): Promise<Incident | null>;
  create?(input: Readonly<{ category: string; description: string; location: string }>, idempotencyKey: string): Promise<Incident>;
}
