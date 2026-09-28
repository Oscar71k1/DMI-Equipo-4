import { createSessionStore } from '../src/application/createSessionStore';
import type { PreferencesStorage } from '../src/domain/PreferencesStorage';
import type { SecureTokenStorage } from '../src/domain/SecureTokenStorage';

// Límite declarado: estos fakes en memoria prueban el CONTRATO del puerto y el
// comportamiento del consumidor. No prueban cifrado real de un dispositivo.
const SENTINEL = 'token-ficticio-unico-sto01';

function leaks(value: unknown): boolean {
  return JSON.stringify(value).includes(SENTINEL);
}

function createFakeSecureStorage(): SecureTokenStorage & { snapshot: () => string | null } {
  let stored: string | null = null;
  return {
    save: async (token) => {
      stored = token;
    },
    read: async () => stored,
    clear: async () => {
      stored = null;
    },
    snapshot: () => stored,
  };
}

function createFailingSecureStorage(failOn: 'save' | 'read' | 'clear'): SecureTokenStorage {
  const failure = () => Promise.reject(new Error(`fallo simulado con ${SENTINEL}`));
  return {
    save: (_token) => (failOn === 'save' ? failure() : Promise.resolve()),
    read: () => (failOn === 'read' ? failure() : Promise.resolve(null)),
    clear: () => (failOn === 'clear' ? failure() : Promise.resolve()),
  };
}

function createRecordingPreferences(): PreferencesStorage & {
  writes: () => readonly (readonly [string, string])[];
} {
  const writes: (readonly [string, string])[] = [];
  return {
    set: async (key, value) => {
      writes.push([key, value]);
    },
    get: async () => null,
    writes: () => writes,
  };
}

describe('almacenamiento seguro del token de sesión (STO / EXP)', () => {
  test('STO-01 nominal: guarda, lee y borra por el puerto seguro sin tocar preferencias ordinarias', async () => {
    // Predicción: persistToken deja el token solo en el almacenamiento seguro,
    // restoreToken lo devuelve, clearToken lo elimina, y ni las preferencias
    // ordinarias ni el log reciben nunca el valor.
    const secure = createFakeSecureStorage();
    const preferences = createRecordingPreferences();
    const logs: unknown[] = [];
    const store = createSessionStore({
      secureStorage: secure,
      preferences,
      log: (entry) => logs.push(entry),
    });

    expect(await store.persistToken(SENTINEL)).toEqual({ kind: 'ok' });
    expect(secure.snapshot()).toBe(SENTINEL);
    expect(await store.restoreToken()).toEqual({ kind: 'ok', token: SENTINEL });
    expect(await store.clearToken()).toEqual({ kind: 'ok' });
    expect(secure.snapshot()).toBeNull();
    expect(await store.restoreToken()).toEqual({ kind: 'ok', token: null });

    expect(leaks(preferences.writes())).toBe(false);
    expect(leaks(logs)).toBe(false);
  });

  test.each(['save', 'read', 'clear'] as const)(
    'STO-02 falla en %s: estado controlado, sin respaldo en texto plano ni éxito falso',
    async (failOn) => {
      // Predicción: si el almacén seguro falla, el consumidor responde
      // 'storage-error', no escribe el token en preferencias ordinarias
      // y no declara éxito.
      const preferences = createRecordingPreferences();
      const store = createSessionStore({
        secureStorage: createFailingSecureStorage(failOn),
        preferences,
        log: () => undefined,
      });

      const result =
        failOn === 'save'
          ? await store.persistToken(SENTINEL)
          : failOn === 'read'
            ? await store.restoreToken()
            : await store.clearToken();

      expect(result.kind).toBe('storage-error');
      expect(preferences.writes()).toEqual([]);
    },
  );

  test('EXP-01 falla: con el error del almacén, ni logs, consola ni resultados contienen el valor protegido', async () => {
    // Predicción: el mensaje del error simulado contiene el valor sintético; aun así
    // no debe aparecer en el log inyectado, en la consola ni en el resultado.
    const spies = (['log', 'error', 'warn', 'info'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    try {
      const logs: unknown[] = [];
      const store = createSessionStore({
        secureStorage: createFailingSecureStorage('save'),
        preferences: createRecordingPreferences(),
        log: (entry) => logs.push(entry),
      });

      const result = await store.persistToken(SENTINEL);

      expect(leaks(result)).toBe(false);
      expect(leaks(logs)).toBe(false);
      for (const spy of spies) expect(leaks(spy.mock.calls)).toBe(false);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});