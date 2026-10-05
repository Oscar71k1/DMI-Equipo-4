import { parseIncidentCreate, parseIncidentList, mapRemoteIncident, IncidentMappingError } from '../infrastructure/IncidentMapper';
import type { IncidentMapping } from '../infrastructure/IncidentMapper';
import type { HttpTransport } from '../domain/HttpTransport';

export type IncidentClientErrorKind = 'timeout' | 'network' | 'server' | 'http' | 'contract' | 'decode' | 'domain' | 'unavailable';
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
  transport?: HttpTransport;
  acceptMissingOperationIdForAdapter?: boolean;
}>;
export type IncidentCreateInput = Readonly<{ category: string; description: string; location: string }>;
export type IncidentListResult = readonly IncidentMapping[];
export type IncidentDetailResult = IncidentMapping | null;
export type IncidentCreateResult = ReturnType<typeof parseIncidentCreate>;

const defaultBaseUrl = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310';

export function createIncidentClient(config: IncidentClientConfig = {}) {
  const baseUrl = config.baseUrl ?? defaultBaseUrl;
  const fetcher = config.fetchImpl ?? fetch;
  const transport = config.transport;
  const timeoutMs = config.timeoutMs ?? 5000;
  const actorId = config.actorId ?? 'reporter-1';
  const token = config.token ?? 'course-valid-token';

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutSignal = () => { timedOut = true; controller.abort(); };
    const timeoutHandle = setTimeout(timeoutSignal, timeoutMs);
    try {
      let response: Readonly<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          'X-Course-Actor': actorId,
        };
        if (init.headers && typeof init.headers === 'object' && !('forEach' in init.headers)) {
          Object.assign(headers, init.headers);
        } else {
          new Headers(init.headers).forEach((value, key) => { headers[key] = value; });
        }
        if (transport) {
          const method = (init.method ?? 'GET') as 'GET' | 'POST';
          let body: unknown;
          if (typeof init.body === 'string') {
            try { body = JSON.parse(init.body); } catch { throw new IncidentClientError('contract'); }
          }
          const result = await transport.request({
            method,
            path: `${baseUrl}${path}`,
            headers,
            ...(body === undefined ? {} : { body }),
            signal: controller.signal,
          });
          response = { ok: result.status >= 200 && result.status < 300, status: result.status, json: result.json };
        } else {
          response = await fetcher(`${baseUrl}${path}`, {
            ...init,
            signal: controller.signal,
            headers,
          });
        }
      } catch (error) {
        if (error instanceof IncidentClientError) throw error;
        if (controller.signal.aborted) throw new IncidentClientError(timedOut ? 'timeout' : 'network');
        throw new IncidentClientError(timedOut ? 'timeout' : 'network');
      }
      if (!response.ok) {
        if (response.status >= 500) throw new IncidentClientError('server', response.status);
        throw new IncidentClientError('http', response.status);
      }
      try {
        return await response.json();
      } catch {
        throw new IncidentClientError('decode');
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  return {
    async listIncidents(): Promise<IncidentListResult> {
      try { return parseIncidentList(await request('/v1/incidents')); }
      catch (error) {
        if (error instanceof IncidentClientError) throw error;
        if (error instanceof IncidentMappingError) throw new IncidentClientError(error.kind);
        throw new IncidentClientError('contract');
      }
    },
    async getIncidentDetail(id: string): Promise<IncidentDetailResult> {
      try {
        const value = await request(`/v1/incidents/${encodeURIComponent(id)}`);
        const mapped = mapRemoteIncident(value);
        const mappedId = mapped.kind === 'unavailable' ? mapped.id : mapped.incident.id;
        if (mappedId !== id) throw new IncidentClientError('contract');
        return mapped;
      } catch (error) {
        if (error instanceof IncidentClientError && error.kind === 'http' && error.status === 404) return null;
        if (error instanceof IncidentClientError) throw error;
        if (error instanceof IncidentMappingError) throw new IncidentClientError(error.kind);
        throw new IncidentClientError('contract');
      }
    },
    async createIncident(input: IncidentCreateInput, idempotencyKey: string): Promise<IncidentCreateResult> {
      if (!/^[\x21-\x7E]{8,}$/.test(idempotencyKey)) throw new IncidentClientError('contract');
      try {
        let response = await request('/v1/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(input),
        });
        if (config.acceptMissingOperationIdForAdapter && typeof response === 'object' && response !== null && !Array.isArray(response) && !('operationId' in response)) {
          response = { ...response, operationId: idempotencyKey };
        }
        return parseIncidentCreate(response);
      } catch (error) {
        if (error instanceof IncidentClientError) throw error;
        if (error instanceof IncidentMappingError) throw new IncidentClientError(error.kind);
        throw new IncidentClientError('contract');
      }
    },
  };
}
