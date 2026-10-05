import { parseRemoteResource } from '../course-evaluation';
import { mapRemoteIncidentToDomain } from '../domain/IncidentRemoteMapper';
import type { Incident } from '../domain/Incident';
import type { HttpTransport } from '../domain/HttpTransport';

export type RemoteError =
  | Readonly<{ kind: 'contract' }>
  | Readonly<{ kind: 'domain' }>
  | Readonly<{ kind: 'server-error'; status: number }>
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

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T | 'timeout' | 'network-error'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } catch {
    if (controller.signal.aborted) return 'timeout';
    return 'network-error';
  } finally {
    clearTimeout(timer);
  }
}

export function createRemoteIncidentClient(deps: RemoteIncidentClientDeps) {
  const { transport, baseUrl, actorId, timeoutMs = 5000 } = deps;
  const headers = { Authorization: 'Bearer course-valid-token', 'X-Course-Actor': actorId };

  async function decode(outcome: Readonly<{ status: number; json: () => Promise<unknown> }>) {
    if (outcome.status >= 500) return { ok: false as const, error: { kind: 'server-error', status: outcome.status } as RemoteError };
    try {
      return { ok: true as const, body: await outcome.json() };
    } catch {
      return { ok: false as const, error: { kind: 'decode' } as RemoteError };
    }
  }

  async function listIncidents(): Promise<RemoteListResult> {
    const outcome = await withTimeout(
      (signal) => transport.request({ method: 'GET', path: `${baseUrl}/v1/incidents`, headers, signal }),
      timeoutMs,
    );
    if (outcome === 'timeout') return { ok: false, error: { kind: 'timeout' } };
    if (outcome === 'network-error') return { ok: false, error: { kind: 'network-error' } };
    const decoded = await decode(outcome);
    if (!decoded.ok) return decoded;

    const body = decoded.body;
    if (typeof body !== 'object' || body === null || !Array.isArray((body as { items?: unknown }).items)) {
      return { ok: false, error: { kind: 'contract' } };
    }
    const items: Incident[] = [];
    for (const raw of (body as { items: readonly unknown[] }).items) {
      const parsed = parseRemoteResource(raw);
      if (!parsed.ok) return { ok: false, error: { kind: 'contract' } };
      const mapped = mapRemoteIncidentToDomain(parsed.value);
      if (!mapped.ok) return { ok: false, error: { kind: 'domain' } };
      items.push(mapped.value);
    }
    return { ok: true, items };
  }

  async function getIncidentDetail(id: string): Promise<RemoteDetailResult> {
    const outcome = await withTimeout(
      (signal) =>
        transport.request({ method: 'GET', path: `${baseUrl}/v1/incidents/${encodeURIComponent(id)}`, headers, signal }),
      timeoutMs,
    );
    if (outcome === 'timeout') return { ok: false, error: { kind: 'timeout' } };
    if (outcome === 'network-error') return { ok: false, error: { kind: 'network-error' } };
    const decoded = await decode(outcome);
    if (!decoded.ok) return decoded;

    const parsed = parseRemoteResource(decoded.body);
    if (!parsed.ok) return { ok: false, error: { kind: 'contract' } };
    const mapped = mapRemoteIncidentToDomain(parsed.value);
    if (!mapped.ok) return { ok: false, error: { kind: 'domain' } };
    return { ok: true, incident: mapped.value };
  }

  async function createIncident(
    input: Readonly<{ category: string; description: string; location: string }>,
    idempotencyKey: string,
  ): Promise<RemoteCreateResult> {
    const outcome = await withTimeout(
      (signal) =>
        transport.request({
          method: 'POST',
          path: `${baseUrl}/v1/incidents`,
          headers: { ...headers, 'Idempotency-Key': idempotencyKey },
          body: input,
          signal,
        }),
      timeoutMs,
    );
    if (outcome === 'timeout') return { ok: false, error: { kind: 'timeout' } };
    if (outcome === 'network-error') return { ok: false, error: { kind: 'network-error' } };
    const decoded = await decode(outcome);
    if (!decoded.ok) return decoded;

    const body = decoded.body;
    if (typeof body !== 'object' || body === null || !('incident' in body)) {
      return { ok: false, error: { kind: 'contract' } };
    }
    const envelope = body as { incident: unknown; duplicate?: unknown };
    const parsed = parseRemoteResource(envelope.incident);
    if (!parsed.ok) return { ok: false, error: { kind: 'contract' } };
    const mapped = mapRemoteIncidentToDomain(parsed.value);
    if (!mapped.ok) return { ok: false, error: { kind: 'domain' } };
    return { ok: true, incident: mapped.value, duplicate: envelope.duplicate === true };
  }

  return { listIncidents, getIncidentDetail, createIncident };
}
