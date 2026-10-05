import { parseIncidentCreate, parseIncidentList, mapRemoteIncident } from '../infrastructure/IncidentMapper';
import type { IncidentMapping } from '../infrastructure/IncidentMapper';

export type IncidentClientErrorKind = 'timeout' | 'network' | 'server' | 'http' | 'contract';
export class IncidentClientError extends Error {
  readonly kind: IncidentClientErrorKind;
  readonly status?: number;
  constructor(kind: IncidentClientErrorKind, status?: number) {
    super(kind === 'http' && status ? `Incident request rejected (${status})` : `Incident request ${kind}`);
    this.name = 'IncidentClientError';
    this.kind = kind;
    if (status !== undefined) this.status = status;
  }
}

export type IncidentClientConfig = Readonly<{
  baseUrl?: string;
  actorId?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;
export type IncidentCreateInput = Readonly<{ category: string; description: string; location: string }>;
export type IncidentListResult = readonly IncidentMapping[];
export type IncidentDetailResult = IncidentMapping | null;
export type IncidentCreateResult = ReturnType<typeof parseIncidentCreate>;

const defaultBaseUrl = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310';

export function createIncidentClient(config: IncidentClientConfig = {}) {
  const baseUrl = config.baseUrl ?? defaultBaseUrl;
  const fetcher = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 5000;
  const actorId = config.actorId ?? 'reporter-1';
  const token = config.token ?? 'course-valid-token';

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutSignal = () => { timedOut = true; controller.abort(); };
    const timeoutHandle = setTimeout(timeoutSignal, timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetcher(`${baseUrl}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Course-Actor': actorId,
            ...(init.headers ?? {}),
          },
        });
      } catch {
        throw new IncidentClientError(timedOut ? 'timeout' : 'network');
      }
      if (!response.ok) {
        if (response.status >= 500) throw new IncidentClientError('server', response.status);
        throw new IncidentClientError('http', response.status);
      }
      try {
        return await response.json();
      } catch {
        throw new IncidentClientError('contract');
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  return {
    async listIncidents(): Promise<IncidentListResult> {
      try { return parseIncidentList(await request('/v1/incidents')); }
      catch (error) { if (error instanceof IncidentClientError) throw error; throw new IncidentClientError('contract'); }
    },
    async getIncidentDetail(id: string): Promise<IncidentDetailResult> {
      try {
        const value = await request(`/v1/incidents/${encodeURIComponent(id)}`);
        const mapped = mapRemoteIncident(value);
        if (mapped.kind !== 'unavailable' && mapped.incident.id !== id) throw new IncidentClientError('contract');
        return mapped;
      } catch (error) {
        if (error instanceof IncidentClientError) throw error;
        if (error instanceof Error && error.message.includes('contract')) throw new IncidentClientError('contract');
        throw new IncidentClientError('contract');
      }
    },
    async createIncident(input: IncidentCreateInput, idempotencyKey: string): Promise<IncidentCreateResult> {
      if (!/^[\x21-\x7E]{8,}$/.test(idempotencyKey)) throw new IncidentClientError('contract');
      try {
        return parseIncidentCreate(await request('/v1/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(input),
        }));
      } catch (error) {
        if (error instanceof IncidentClientError) throw error;
        throw new IncidentClientError('contract');
      }
    },
  };
}
