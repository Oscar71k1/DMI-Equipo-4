import type { Clock, RefreshedTokens, SessionRefreshPort } from '../domain/SessionRefreshPort';
import type { SessionStore } from './createSessionStore';

export type HttpOutcome = Readonly<{ status: number; body?: unknown }>;

export type CoordinatedResult =
  | Readonly<{ kind: 'ok'; outcome: HttpOutcome }>
  | Readonly<{ kind: 'unauthenticated' }>
  | Readonly<{ kind: 'unauthorized' }>;

export type SessionCoordinatorDependencies = Readonly<{
  refreshPort: SessionRefreshPort;
  store: SessionStore;
  clock: Clock;
  log: (entry: Readonly<Record<string, unknown>>) => void;
}>;

export type SessionCoordinator = Readonly<{
  login: (tokens: RefreshedTokens) => Promise<void>;
  logout: () => Promise<void>;
  run: (requestId: string, send: (accessToken: string) => Promise<HttpOutcome>) => Promise<CoordinatedResult>;
  snapshot: () => Readonly<{ status: 'anonymous' | 'authenticated'; generation: number; refreshCalls: number }>;
}>;

export function createSessionCoordinator(deps: SessionCoordinatorDependencies): SessionCoordinator {
  const { refreshPort, store, clock, log } = deps;
  let status: 'anonymous' | 'authenticated' = 'anonymous';
  let generation = 0;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let expiresAt = 0;
  let refreshCalls = 0;
  let inFlight: Promise<boolean> | null = null;

  // Estado seguro. Subir la generación deja "viejo" cualquier refresh en curso.
  function clearLocal() {
    status = 'anonymous';
    accessToken = null;
    refreshToken = null;
    expiresAt = 0;
    generation += 1;
  }

  // Una sola promesa compartida por todos los que reciben 401 (single-flight).
  function refreshShared(): Promise<boolean> {
    if (inFlight) return inFlight;
    const token = refreshToken;
    if (status !== 'authenticated' || token === null) return Promise.resolve(false);
    const started = generation;
    refreshCalls += 1;
    log({ event: 'session-refresh-start', generation: started });

    const attempt = (async (): Promise<boolean> => {
      try {
        const next = await refreshPort.refresh(token);
        if (generation !== started || status !== 'authenticated') {
          log({ event: 'session-refresh-stale', generation: started });
          return false;
        }
        generation += 1;
        accessToken = next.accessToken;
        refreshToken = next.refreshToken;
        expiresAt = clock.now() + next.expiresInSeconds * 1000;
        await store.persistToken(next.refreshToken);
        log({ event: 'session-refresh-success', generation });
        return true;
      } catch {
        if (generation === started && status === 'authenticated') {
          clearLocal();
          await store.clearToken();
          log({ event: 'session-refresh-failed', generation });
        }
        return false;
      }
    })();

    inFlight = attempt;
    void attempt.finally(() => { if (inFlight === attempt) inFlight = null; });
    return attempt;
  }

  return {
    async login(tokens) {
      generation += 1;
      status = 'authenticated';
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      expiresAt = clock.now() + tokens.expiresInSeconds * 1000;
      await store.persistToken(tokens.refreshToken);
      log({ event: 'session-login', generation });
    },

    async logout() {
      clearLocal();
      await store.clearToken();
      log({ event: 'session-logout', generation });
    },

    async run(requestId, send) {
      if (status !== 'authenticated' || accessToken === null) return { kind: 'unauthenticated' };

      if (clock.now() >= expiresAt) {
        log({ event: 'session-expired', requestId });
        if (!(await refreshShared())) return { kind: 'unauthenticated' };
      }

      const firstToken = accessToken as string | null;
      if (firstToken === null) return { kind: 'unauthenticated' };
      const seen = generation;
      const first = await send(firstToken);
      if (first.status !== 401) return { kind: 'ok', outcome: first };

      log({ event: 'request-401', requestId, generation: seen });
      // Si la sesión ya se renovó mientras yo esperaba, no hace falta otro refresh.
      if (generation === seen && !(await refreshShared())) return { kind: 'unauthenticated' };

      const secondToken = accessToken as string | null;
      if (status !== 'authenticated' || secondToken === null) return { kind: 'unauthenticated' };
      log({ event: 'request-retry', requestId, generation });
      const second = await send(secondToken);
      // Un solo reintento por solicitud: si vuelve a fallar, no se entra en bucle.
      if (second.status === 401) return { kind: 'unauthorized' };
      return { kind: 'ok', outcome: second };
    },

    snapshot: () => ({ status, generation, refreshCalls }),
  };
}