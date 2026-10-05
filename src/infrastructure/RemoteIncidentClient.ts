import { createIncidentClient, IncidentClientError } from '../api/incidentClient';
import type { IncidentMapping } from './IncidentMapper';
import type { Incident } from '../domain/Incident';
import type { HttpTransport } from '../domain/HttpTransport';

export type RemoteError =
  | Readonly<{ kind: 'contract' }>
  | Readonly<{ kind: 'domain' }>
  | Readonly<{ kind: 'server-error'; status: number }>
  | Readonly<{ kind: 'http-error'; status: number }>
  | Readonly<{ kind: 'timeout' }>
  | Readonly<{ kind: 'network-error' }>
  | Readonly<{ kind: 'decode' }>;

export type RemoteListResult =
  | Readonly<{ ok: true; items: readonly Incident[] }>
  | Readonly<{ ok: false; error: RemoteError }>;

export type RemoteDetailResult =
  | Readonly<{ ok: true; incident: Incident }>
  | Readonly<{ ok: false; error: RemoteError }>;

export type RemoteCreateResult =
  | Readonly<{ ok: true; incident: Incident; duplicate: boolean }>
  | Readonly<{ ok: false; error: RemoteError }>;

export type RemoteIncidentClientDeps = Readonly<{
  transport: HttpTransport;
  baseUrl: string;
  actorId: string;
  timeoutMs?: number;
}>;

function mapError(error: unknown): RemoteError {
  if (!(error instanceof IncidentClientError)) return { kind: 'contract' };
  switch (error.kind) {
    case 'timeout': return { kind: 'timeout' };
    case 'network': return { kind: 'network-error' };
    case 'server': return { kind: 'server-error', status: error.status ?? 500 };
    case 'http': return { kind: 'http-error', status: error.status ?? 400 };
    case 'decode': return { kind: 'decode' };
    case 'domain':
    case 'unavailable': return { kind: 'domain' };
    case 'contract': return { kind: 'contract' };
  }
}

function requireIncident(mapping: IncidentMapping): Incident {
  if (mapping.kind === 'unavailable') throw new IncidentClientError('unavailable');
  return mapping.incident;
}

export function createRemoteIncidentClient(deps: RemoteIncidentClientDeps) {
  const client = createIncidentClient({
    transport: deps.transport,
    baseUrl: deps.baseUrl,
    actorId: deps.actorId,
    acceptMissingOperationIdForAdapter: true,
    ...(deps.timeoutMs === undefined ? {} : { timeoutMs: deps.timeoutMs }),
  });

  return {
    async listIncidents(): Promise<RemoteListResult> {
      try {
        const mappings = await client.listIncidents();
        return { ok: true, items: mappings.map(requireIncident) };
      } catch (error) {
        return { ok: false, error: mapError(error) };
      }
    },
    async getIncidentDetail(id: string): Promise<RemoteDetailResult> {
      try {
        const result = await client.getIncidentDetail(id);
        if (result === null) return { ok: false, error: { kind: 'http-error', status: 404 } };
        return { ok: true, incident: requireIncident(result) };
      } catch (error) {
        return { ok: false, error: mapError(error) };
      }
    },
    async createIncident(
      input: Readonly<{ category: string; description: string; location: string }>,
      idempotencyKey: string,
    ): Promise<RemoteCreateResult> {
      try {
        const result = await client.createIncident(input, idempotencyKey);
        return { ok: true, incident: requireIncident(result.incident), duplicate: result.duplicate };
      } catch (error) {
        return { ok: false, error: mapError(error) };
      }
    },
  };
}
