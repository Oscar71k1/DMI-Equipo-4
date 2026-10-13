import { SessionLoginRejectedError } from '../domain/SessionRefreshPort';
import type { SessionIdentity, RefreshedTokens, SessionLoginPort, SessionRefreshPort } from '../domain/SessionRefreshPort';
import type { SessionStore } from './createSessionStore';

export type HttpOutcome = Readonly<{ status: number; body?: unknown }>;

export type CoordinatedResult =
  | Readonly<{ kind: 'ok'; outcome: HttpOutcome }>
  | Readonly<{ kind: 'unauthenticated' }>
  | Readonly<{ kind: 'unauthorized' }>;

export type SessionSnapshot = Readonly<{
  status: 'restoring' | 'anonymous' | 'authenticated' | 'expired' | 'refreshing';
  generation: number;
  refreshCalls: number;
  identity: SessionIdentity | null;
  expiresAt: number | null;
}>;

export type SessionCoordinatorDependencies = Readonly<{
  refreshPort: SessionRefreshPort;
  loginPort?: SessionLoginPort;
  store: SessionStore;
  clock: Readonly<{ now: () => number }>;
  log: (entry: Readonly<Record<string, unknown>>) => void;
}>;

type PersistedSession = Readonly<{
  schemaVersion: 1;
  identity: SessionIdentity;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}>;

export type SessionCoordinator = Readonly<{
  login: (tokens: RefreshedTokens, identity?: SessionIdentity) => Promise<void>;
  signIn: (actorId: string) => Promise<'ok' | 'rejected' | 'network-error' | 'storage-error'>;
  restore: () => Promise<void>;
  logout: () => Promise<'ok' | 'storage-error'>;
  run: (requestId: string, send: (accessToken: string) => Promise<HttpOutcome>) => Promise<CoordinatedResult>;
  snapshot: () => SessionSnapshot;
  getActorId: () => string | null;
  subscribe: (listener: (snapshot: SessionSnapshot) => void) => () => void;
}>;

function parsePersistedSession(value: string | null): PersistedSession | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<PersistedSession>;
    const identity = candidate.identity;
    if (
      candidate.schemaVersion === 1 && typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0 &&
      typeof candidate.refreshToken === 'string' && candidate.refreshToken.length > 0 &&
      typeof candidate.expiresAt === 'number' && Number.isFinite(candidate.expiresAt) &&
      identity !== undefined && typeof identity.actorId === 'string' && identity.actorId.length > 0 &&
      (identity.role === 'reporter' || identity.role === 'technician' || identity.role === 'coordinator')
    ) return candidate as PersistedSession;
  } catch { /* Corrupt storage is handled as an anonymous session. */ }
  return null;
}

export function createSessionCoordinator(deps: SessionCoordinatorDependencies): SessionCoordinator {
  const { refreshPort, loginPort, store, clock } = deps;
  let status: SessionSnapshot['status'] = 'restoring';
  let generation = 0;
  let sessionEpoch = 0;
  let loginAttempt = 0;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let identity: SessionIdentity | null = null;
  let expiresAt: number | null = null;
  let refreshCalls = 0;
  let inFlight: Readonly<{ epoch: number; promise: Promise<boolean> }> | null = null;
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();

  function snapshot(): SessionSnapshot {
    return { status, generation, refreshCalls, identity, expiresAt };
  }

  function emit() {
    const current = snapshot();
    for (const listener of listeners) {
      try { listener(current); } catch { /* UI subscribers cannot break session transitions. */ }
    }
  }

  function safeLog(entry: Readonly<Record<string, unknown>>) {
    try { deps.log(entry); } catch { /* Logging is best effort and never receives token values. */ }
  }

  function clearLocal() {
    status = 'anonymous';
    accessToken = null;
    refreshToken = null;
    identity = null;
    expiresAt = null;
    generation += 1;
    sessionEpoch += 1;
    emit();
  }

  function persistedValue(): string {
    if (identity && accessToken && refreshToken && expiresAt !== null) {
      return JSON.stringify({ schemaVersion: 1, identity, accessToken, refreshToken, expiresAt } satisfies PersistedSession);
    }
    // Compatibility for the coordinator's isolated contract callers, which have no actor identity.
    return refreshToken ?? '';
  }

  async function saveCurrentSession(expectedGeneration: number): Promise<boolean> {
    const result = await store.persistToken(persistedValue());
    if (generation !== expectedGeneration || (status !== 'authenticated' && status !== 'refreshing')) return false;
    if (result.kind === 'storage-error') {
      clearLocal();
      const cleared = await store.clearToken();
      if (cleared.kind === 'storage-error') safeLog({ event: 'session-storage-error', operation: 'clear' });
      safeLog({ event: 'session-storage-error', operation: 'save' });
      return false;
    }
    return true;
  }

  async function clearFailedSession(expectedGeneration: number, event: string): Promise<void> {
    if (generation !== expectedGeneration) return;
    clearLocal();
    const cleared = await store.clearToken();
    if (cleared.kind === 'storage-error') safeLog({ event: 'session-storage-error', operation: 'clear' });
    safeLog({ event, generation });
  }

  async function installTokens(tokens: RefreshedTokens, sessionIdentity?: SessionIdentity): Promise<void> {
    generation += 1;
    sessionEpoch += 1;
    status = 'authenticated';
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    identity = sessionIdentity ?? null;
    expiresAt = clock.now() + tokens.expiresInSeconds * 1000;
    emit();
    if (!(await saveCurrentSession(generation))) throw new Error('Session storage unavailable');
    safeLog({ event: 'session-login', generation });
  }

  function refreshShared(): Promise<boolean> {
    if (inFlight?.epoch === sessionEpoch) return inFlight.promise;
    const oldRefreshToken = refreshToken;
    if ((status !== 'authenticated' && status !== 'expired') || oldRefreshToken === null) {
      if (status === 'authenticated' || status === 'expired') {
        const missingTokenGeneration = generation;
        return clearFailedSession(missingTokenGeneration, 'session-refresh-unavailable').then(() => false);
      }
      return Promise.resolve(false);
    }
    const startedGeneration = generation;
    const startedEpoch = sessionEpoch;
    status = 'refreshing';
    emit();
    refreshCalls += 1;
    safeLog({ event: 'session-refresh-start', generation: startedGeneration });

    const attempt = (async (): Promise<boolean> => {
      try {
        const next = await refreshPort.refresh(oldRefreshToken);
        if (generation !== startedGeneration || sessionEpoch !== startedEpoch || status !== 'refreshing') {
          safeLog({ event: 'session-refresh-stale', generation: startedGeneration });
          return false;
        }
        accessToken = next.accessToken;
        refreshToken = next.refreshToken;
        expiresAt = clock.now() + next.expiresInSeconds * 1000;
        generation += 1;
        status = 'authenticated';
        emit();
        if (!(await saveCurrentSession(generation))) return false;
        safeLog({ event: 'session-refresh-success', generation });
        return true;
      } catch {
        await clearFailedSession(startedGeneration, 'session-refresh-failed');
        return false;
      }
    })();

    const flight = { epoch: startedEpoch, promise: attempt } as const;
    inFlight = flight;
    void attempt.finally(() => { if (inFlight === flight) inFlight = null; });
    return attempt;
  }

  return {
    async login(tokens, sessionIdentity) {
      loginAttempt += 1;
      await installTokens(tokens, sessionIdentity);
    },

    async signIn(actorId) {
      if (!loginPort) return 'rejected';
      const attempt = ++loginAttempt;
      clearLocal();
      const removed = await store.clearToken();
      if (attempt !== loginAttempt) return 'rejected';
      if (removed.kind === 'storage-error') return 'storage-error';
      try {
        const result = await loginPort.login(actorId);
        if (attempt !== loginAttempt) return 'rejected';
        await installTokens(result.tokens, result.identity);
        return 'ok';
      } catch (error) {
        if (attempt !== loginAttempt) return 'rejected';
        if (error instanceof SessionLoginRejectedError) return 'rejected';
        return error instanceof Error && error.message === 'Session storage unavailable' ? 'storage-error' : 'network-error';
      }
    },

    async restore() {
      const expectedGeneration = generation;
      const result = await store.restoreToken();
      if (generation !== expectedGeneration) return;
      if (result.kind === 'storage-error') {
        status = 'anonymous';
        emit();
        safeLog({ event: 'session-storage-error', operation: 'read' });
        return;
      }
      const saved = parsePersistedSession(result.token);
      if (!saved) {
        status = 'anonymous';
        emit();
        if (result.token !== null) {
          const cleared = await store.clearToken();
          if (cleared.kind === 'storage-error') safeLog({ event: 'session-storage-error', operation: 'clear-invalid' });
          safeLog({ event: 'session-storage-invalid', operation: 'restore' });
        }
        return;
      }
      accessToken = saved.accessToken;
      refreshToken = saved.refreshToken;
      identity = saved.identity;
      expiresAt = saved.expiresAt;
      status = saved.expiresAt <= clock.now() ? 'expired' : 'authenticated';
      generation += 1;
      sessionEpoch += 1;
      emit();
      const wasExpired = status === 'expired';
      safeLog({ event: wasExpired ? 'session-restored-expired' : 'session-restored', generation });
      if (wasExpired) await refreshShared();
    },

    async logout() {
      loginAttempt += 1;
      clearLocal();
      const cleared = await store.clearToken();
      if (cleared.kind === 'storage-error') {
        safeLog({ event: 'session-storage-error', operation: 'logout' });
        return 'storage-error';
      }
      safeLog({ event: 'session-logout', generation });
      return 'ok';
    },

    async run(requestId, send) {
      if ((status !== 'authenticated' && status !== 'expired' && status !== 'refreshing') || accessToken === null) {
        return { kind: 'unauthenticated' };
      }

      if (status === 'refreshing' && inFlight) {
        if (!(await inFlight.promise)) return { kind: 'unauthenticated' };
      } else if (status === 'expired' || (expiresAt !== null && clock.now() >= expiresAt)) {
        status = 'expired';
        emit();
        if (!(await refreshShared())) return { kind: 'unauthenticated' };
      }

      const firstToken = accessToken;
      if (firstToken === null || status !== 'authenticated') return { kind: 'unauthenticated' };
      const sentGeneration = generation;
      const requestEpoch = sessionEpoch;
      const first = await send(firstToken);
      if (sessionEpoch !== requestEpoch) return { kind: 'unauthenticated' };
      if (first.status !== 401) return { kind: 'ok', outcome: first };

      safeLog({ event: 'request-401', requestId, generation: sentGeneration });
      if (generation === sentGeneration && !(await refreshShared())) return { kind: 'unauthenticated' };
      if (status === 'refreshing' && inFlight && !(await inFlight.promise)) return { kind: 'unauthenticated' };
      if (sessionEpoch !== requestEpoch) return { kind: 'unauthenticated' };
      const retryToken = accessToken;
      if (status !== 'authenticated' || retryToken === null) return { kind: 'unauthenticated' };

      safeLog({ event: 'request-retry', requestId, generation });
      const retried = await send(retryToken);
      return retried.status === 401 ? { kind: 'unauthorized' } : { kind: 'ok', outcome: retried };
    },

    snapshot,
    getActorId: () => identity?.actorId ?? null,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
