import { SessionLoginRejectedError } from '../domain/SessionRefreshPort';
import type { RefreshedTokens, SessionIdentity, SessionLoginPort, SessionRefreshPort } from '../domain/SessionRefreshPort';

const DEFAULT_URL = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseTokens(value: unknown): RefreshedTokens {
  const record = asRecord(value);
  if (
    !record || typeof record.accessToken !== 'string' || !record.accessToken ||
    typeof record.refreshToken !== 'string' || !record.refreshToken ||
    typeof record.expiresIn !== 'number' || !Number.isFinite(record.expiresIn) || record.expiresIn <= 0
  ) throw new Error('Session response contract rejected');
  return {
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    expiresInSeconds: record.expiresIn,
  };
}

async function postJson(fetcher: typeof fetch, url: string, body: unknown): Promise<unknown> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Session endpoint rejected (${response.status})`);
  return response.json();
}

export function createCourseSessionAdapter(options: Readonly<{
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}> = {}): SessionLoginPort & SessionRefreshPort {
  const baseUrl = options.baseUrl ?? DEFAULT_URL;
  const fetcher = options.fetchImpl ?? fetch;

  return {
    async login(actorId: string): Promise<Readonly<{ identity: SessionIdentity; tokens: RefreshedTokens }>> {
      if (!['reporter-1', 'reporter-2', 'technician-1', 'technician-2', 'coordinator-1'].includes(actorId)) {
        throw new SessionLoginRejectedError();
      }
      let response: unknown;
      try {
        response = await postJson(fetcher, `${baseUrl}/v1/session/login`, { actorId });
      } catch (error) {
        if (error instanceof Error && error.message === 'Session endpoint rejected (401)') {
          throw new SessionLoginRejectedError();
        }
        throw error;
      }
      const result = asRecord(response);
      const tokens = parseTokens(result);
      const role = result?.role;
      if (result?.actorId !== actorId || (role !== 'reporter' && role !== 'technician' && role !== 'coordinator')) {
        throw new Error('Session identity contract rejected');
      }
      return { identity: { actorId, role }, tokens };
    },

    async refresh(refreshToken: string): Promise<RefreshedTokens> {
      const result = await postJson(fetcher, `${baseUrl}/v1/session/refresh`, { refreshToken });
      return parseTokens(result);
    },
  };
}
