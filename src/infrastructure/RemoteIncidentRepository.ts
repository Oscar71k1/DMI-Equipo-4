import type { IncidentRepository } from '../domain/IncidentRepository';
import type { Incident } from '../domain/Incident';
import { createIncidentClient, type IncidentClientConfig } from '../api/incidentClient';
import { IncidentClientError } from '../api/incidentClient';

export function createRemoteIncidentRepository(config: IncidentClientConfig = {}): IncidentRepository {
  const client = createIncidentClient(config);
  const requireIncident = (result: Awaited<ReturnType<typeof client.getIncidentDetail>>): Incident => {
    if (!result) throw new IncidentClientError('contract');
    if (result.kind === 'unavailable') throw new IncidentClientError('unavailable');
    return result.incident;
  };
  return {
    async list() {
      const results = await client.listIncidents();
      return results.map(requireIncident);
    },
    async getById(id) {
      const result = await client.getIncidentDetail(id);
      return result === null ? null : requireIncident(result);
    },
    async create(input, idempotencyKey) {
      return requireIncident((await client.createIncident(input, idempotencyKey)).incident);
    },
  };
}
