import { parseIncidentCreate, parseIncidentList, mapRemoteIncident, mapQueueSnapshot, IncidentMappingError } from '../infrastructure/IncidentMapper';
import type { IncidentMapping } from '../infrastructure/IncidentMapper';
import type { HttpTransport } from '../domain/HttpTransport';
import type { AuthenticatedRequestPort, AuthenticatedHttpOutcome } from '../domain/AuthenticatedRequestPort';
import type { IncidentAction } from '../domain/incidentAuthorization';

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
  session?: AuthenticatedRequestPort;
  acceptMissingOperationIdForAdapter?: boolean;
}>;
export type IncidentCreateInput = Readonly<{ category: string; description: string; location: string }>;
export type IncidentListResult = readonly IncidentMapping[];
export type IncidentDetailResult = IncidentMapping | null;
export type IncidentCreateResult = ReturnType<typeof parseIncidentCreate>;
export type IncidentActionInput = Readonly<{
  action: IncidentAction;
  baseVersion: number;
  technicianId?: string;
  priority?: 'low' | 'medium' | 'high';
  diagnosis?: string;
  text?: string;
  evidenceId?: string;
}>;

const defaultBaseUrl = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310';

export function createIncidentClient(config: IncidentClientConfig = {}) {
  const baseUrl = config.baseUrl ?? defaultBaseUrl;
  const fetcher = config.fetchImpl ?? fetch;
  const transport = config.transport;
  const timeoutMs = config.timeoutMs ?? 5000;
  const actorId = config.actorId ?? 'reporter-1';
  const token = config.token ?? 'course-valid-token';
  let requestSequence = 0;

  async function send(path: string, init: RequestInit, accessToken: string): Promise<AuthenticatedHttpOutcome> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutSignal = () => { timedOut = true; controller.abort(); };
    const timeoutHandle = setTimeout(timeoutSignal, timeoutMs);
    try {
      let response: Readonly<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
          'X-Course-Actor': config.session?.getActorId() ?? actorId,
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
      if (!response.ok) return { status: response.status };
      try {
        return { status: response.status, body: await response.json() };
      } catch {
        throw new IncidentClientError('decode');
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const requestId = `${init.method ?? 'GET'}:${path}:${++requestSequence}`;
    let outcome: AuthenticatedHttpOutcome;
    if (config.session) {
      const result = await config.session.run(requestId, (accessToken) => send(path, init, accessToken));
      if (result.kind !== 'ok') throw new IncidentClientError('http', 401);
      outcome = result.outcome;
    } else {
      outcome = await send(path, init, token);
    }
    if (outcome.status < 200 || outcome.status >= 300) {
      if (outcome.status >= 500) throw new IncidentClientError('server', outcome.status);
      throw new IncidentClientError('http', outcome.status);
    }
    return outcome.body;
  }

  return {
    async getIncidentSnapshot(id: string) {
      const snapshot = mapQueueSnapshot(await request(`/v1/incidents/${encodeURIComponent(id)}`));
      if (snapshot.id !== id) throw new IncidentClientError('contract');
      return snapshot;
    },
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
    async performIncidentAction(id: string, input: IncidentActionInput, idempotencyKey: string) {
      if (!/^[\x21-\x7E]{8,}$/.test(idempotencyKey) || !Number.isInteger(input.baseVersion) || input.baseVersion < 0) {
        throw new IncidentClientError('contract');
      }
      try {
        const value = await request(`/v1/incidents/${encodeURIComponent(id)}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(input),
        });
        const confirmation = parseIncidentCreate(value);
        const confirmedId =
          confirmation.incident.kind === 'unavailable'
            ? confirmation.incident.id
            : confirmation.incident.incident.id;
        // Solo es la confirmación de ESTA operación y de ESTA incidencia.
        if (confirmation.operationId !== idempotencyKey || confirmedId !== id) {
          throw new IncidentClientError('contract');
        }
        return { ...confirmation, snapshot: confirmation.incident.kind === 'mapped'
          ? mapQueueSnapshot((value as { incident: unknown }).incident) : null };
      } catch (error) {
        if (error instanceof IncidentClientError) throw error;
        if (error instanceof IncidentMappingError) throw new IncidentClientError(error.kind);
        throw new IncidentClientError('contract');
      }
    },
  };
}
