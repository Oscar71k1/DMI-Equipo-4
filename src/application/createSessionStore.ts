import type { PreferencesStorage } from '../domain/PreferencesStorage';
import type { SecureTokenStorage } from '../domain/SecureTokenStorage';

export type SessionStoreResult = Readonly<{ kind: 'ok' }> | Readonly<{ kind: 'storage-error' }>;

export type RestoreTokenResult =
  | Readonly<{ kind: 'ok'; token: string | null }>
  | Readonly<{ kind: 'storage-error' }>;

export type SessionStore = Readonly<{
  persistToken: (token: string) => Promise<SessionStoreResult>;
  restoreToken: () => Promise<RestoreTokenResult>;
  clearToken: () => Promise<SessionStoreResult>;
}>;

export type SessionStoreDependencies = Readonly<{
  secureStorage: SecureTokenStorage;
  preferences: PreferencesStorage;
  log: (entry: unknown) => void;
}>;

export function createSessionStore(_dependencies: SessionStoreDependencies): SessionStore {
  throw new Error('createSessionStore must be implemented in the assigned week');
}