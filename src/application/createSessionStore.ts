import type { PreferencesStorage } from '../domain/PreferencesStorage';
import type { SecureTokenStorage } from '../domain/SecureTokenStorage';
import { redactForTelemetry } from '../domain/redactForTelemetry';

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
  preferences?: PreferencesStorage;
  log: (entry: unknown) => void;
}>;

export function createSessionStore({ secureStorage, log }: SessionStoreDependencies): SessionStore {
  // Serialize operations so a slow save cannot restore a token after clear.
  let tail: Promise<unknown> = Promise.resolve();
  function execute<T>(operation: string, action: () => Promise<T>): Promise<T | { kind: 'storage-error' }> {
    const result = tail.then(async () => {
      try {
        return await action();
      } catch {
        // Never forward native messages, stacks, tokens or response bodies.
        try { log(redactForTelemetry({ event: 'session-storage-error', operation })); } catch { /* Logging is best effort. */ }
        return { kind: 'storage-error' as const };
      }
    });
    tail = result;
    return result;
  }
  return {
    persistToken: (token) => execute('save', async () => {
      if (!token.trim()) throw new Error('Empty token');
      await secureStorage.save(token);
      return { kind: 'ok' as const };
    }),
    restoreToken: () => execute('read', async () => ({ kind: 'ok' as const, token: await secureStorage.read() })),
    clearToken: () => execute('clear', async () => {
      await secureStorage.clear();
      return { kind: 'ok' as const };
    }),
  };
}
