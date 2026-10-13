import type { SessionStore } from './createSessionStore';

export type SessionActor = Readonly<{ actorId: string; role: string }>;

export type SessionState =
  | Readonly<{ kind: 'restoring' }>
  | Readonly<{ kind: 'unauthenticated' }>
  | Readonly<{ kind: 'authenticated'; actor: SessionActor; expiresAt: number }>
  | Readonly<{ kind: 'expired'; actor: SessionActor }>;

export type LoginResponse =
  | Readonly<{
      kind: 'ok';
      actorId: string;
      role: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number; // segundos
    }>
  | Readonly<{ kind: 'rejected' }>
  | Readonly<{ kind: 'network-error' }>;

export type LoginResult =
  | Readonly<{ kind: 'ok' }>
  | Readonly<{ kind: 'rejected' }>
  | Readonly<{ kind: 'network-error' }>
  | Readonly<{ kind: 'storage-error' }>;

type StoredSession = Readonly<{
  actorId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}>;

export type SessionManagerDependencies = Readonly<{
  store: SessionStore;
  login: (actorId: string) => Promise<LoginResponse>;
  now?: () => number;
}>;

export type SessionManager = Readonly<{
  getState: () => SessionState;
  subscribe: (listener: (state: SessionState) => void) => () => void;
  getActor: () => SessionActor | null;
  restore: () => Promise<void>;
  signIn: (actorId: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  markExpired: () => void;
  onRefreshFailed: () => Promise<void>;
}>;

function parseStored(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof v.actorId === 'string' && typeof v.role === 'string' &&
      typeof v.accessToken === 'string' && typeof v.refreshToken === 'string' &&
      typeof v.expiresAt === 'number'
    ) return v as StoredSession;
  } catch { /* JSON inválido: se trata como sin sesión */ }
  return null;
}

export function createSessionManager({ store, login, now = Date.now }: SessionManagerDependencies): SessionManager {
  let state: SessionState = { kind: 'restoring' };
  let generation = 0; // sube con cada logout/login para descartar operaciones viejas
  const listeners = new Set<(s: SessionState) => void>();

  function setState(next: SessionState) {
    state = next;
    listeners.forEach((l) => l(state));
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getActor: () =>
      state.kind === 'authenticated' || state.kind === 'expired' ? state.actor : null,

    async restore() {
      const gen = generation;
      const result = await store.restoreToken();
      if (gen !== generation) return; // hubo logout/login mientras tanto
      if (result.kind === 'storage-error') return setState({ kind: 'unauthenticated' });
      const session = parseStored(result.token);
      if (!session) return setState({ kind: 'unauthenticated' });
      const actor = { actorId: session.actorId, role: session.role };
      if (session.expiresAt <= now()) return setState({ kind: 'expired', actor });
      setState({ kind: 'authenticated', actor, expiresAt: session.expiresAt });
    },

    async signIn(actorId) {
      const gen = ++generation;
      const response = await login(actorId);
      if (gen !== generation) return { kind: 'rejected' }; // un logout lo canceló
      if (response.kind !== 'ok') return { kind: response.kind };
      const expiresAt = now() + response.expiresIn * 1000;
      const saved = await store.persistToken(
        JSON.stringify({
          actorId: response.actorId,
          role: response.role,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt,
        } satisfies StoredSession),
      );
      if (gen !== generation) return { kind: 'rejected' };
      if (saved.kind === 'storage-error') {
        setState({ kind: 'unauthenticated' });
        return { kind: 'storage-error' };
      }
      setState({
        kind: 'authenticated',
        actor: { actorId: response.actorId, role: response.role },
        expiresAt,
      });
      return { kind: 'ok' };
    },

    async signOut() {
      generation++; // invalida login o restore en curso
      setState({ kind: 'unauthenticated' }); // la UI sale de inmediato
      await store.clearToken(); // el store lo encola detrás de cualquier guardado
    },

    markExpired() {
      if (state.kind === 'authenticated') setState({ kind: 'expired', actor: state.actor });
    },

    async onRefreshFailed() {
      generation++;
      setState({ kind: 'unauthenticated' }); // transición explícita que pide tu guía
      await store.clearToken();
    },
  };
}