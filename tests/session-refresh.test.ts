import { createSessionCoordinator } from '../src/application/createSessionCoordinator';
import { createSessionStore } from '../src/application/createSessionStore';
import type { SecureTokenStorage } from '../src/domain/SecureTokenStorage';
import type { RefreshedTokens, SessionRefreshPort } from '../src/domain/SessionRefreshPort';

function createFakeClock(start = 0) {
  let current = start;
  return { now: () => current, advance: (ms: number) => { current += ms; } };
}

function createMemoryStorage() {
  let value: string | null = null;
  const writes: string[] = [];
  const storage: SecureTokenStorage = {
    save: async (token) => { writes.push(token); value = token; },
    read: async () => value,
    clear: async () => { value = null; },
  };
  return { storage, writes, current: () => value };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const NEW_TOKENS: RefreshedTokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 60 };

function setup(refresh: SessionRefreshPort['refresh']) {
  const clock = createFakeClock();
  const memory = createMemoryStorage();
  const logs: unknown[] = [];
  const store = createSessionStore({ secureStorage: memory.storage, log: () => undefined });
  const coordinator = createSessionCoordinator({
    refreshPort: { refresh },
    store,
    clock,
    log: (entry) => logs.push(entry),
  });
  return { clock, memory, logs, coordinator };
}

const send = (validToken: string) => async (token: string) => ({ status: token === validToken ? 200 : 401 });

describe('Semana 6 — renovación concurrente de sesión', () => {
  test('SES-01 single-flight: 3 solicitudes con 401 comparten 1 refresh y cada una se reintenta 1 vez', async () => {
    // Predicción: refreshCalls = 1, las 3 terminan ok, 6 envíos en total (3 + 3 reintentos).
    const pending = deferred<RefreshedTokens>();
    let refreshCalls = 0;
    const { coordinator } = setup(() => { refreshCalls += 1; return pending.promise; });
    await coordinator.login({ accessToken: 'access-0', refreshToken: 'refresh-0', expiresInSeconds: 60 });
    const sender = jest.fn(send('access-1'));

    const all = Promise.all(['a', 'b', 'c'].map((id) => coordinator.run(id, sender)));
    await flush();
    pending.resolve(NEW_TOKENS);
    const results = await all;

    expect(refreshCalls).toBe(1);
    expect(results.map((r) => r.kind)).toEqual(['ok', 'ok', 'ok']);
    expect(sender).toHaveBeenCalledTimes(6);
    expect(coordinator.snapshot().generation).toBe(2);
  });

  test('SES-02 refresh rechazado: una sola transición a anónimo, token borrado, sin bucle', async () => {
    // Predicción: las 3 terminan 'unauthenticated', refreshCalls = 1, token persistido = null,
    // y una solicitud nueva no dispara otro refresh.
    const pending = deferred<RefreshedTokens>();
    let refreshCalls = 0;
    const { coordinator, memory } = setup(() => { refreshCalls += 1; return pending.promise; });
    await coordinator.login({ accessToken: 'access-0', refreshToken: 'refresh-0', expiresInSeconds: 60 });

    const all = Promise.all(['a', 'b', 'c'].map((id) => coordinator.run(id, send('access-1'))));
    await flush();
    pending.reject(new Error('invalid_grant'));
    const results = await all;
    const later = await coordinator.run('d', send('access-1'));

    expect(results.map((r) => r.kind)).toEqual(['unauthenticated', 'unauthenticated', 'unauthenticated']);
    expect(later.kind).toBe('unauthenticated');
    expect(refreshCalls).toBe(1);
    expect(coordinator.snapshot().status).toBe('anonymous');
    expect(memory.current()).toBeNull();
  });

  test('SES-03 logout durante el refresh: la respuesta tardía no resucita la sesión', async () => {
    // Predicción: queda anónimo, token = null y no se escribe el token nuevo.
    const pending = deferred<RefreshedTokens>();
    const { coordinator, memory } = setup(() => pending.promise);
    await coordinator.login({ accessToken: 'access-0', refreshToken: 'refresh-0', expiresInSeconds: 60 });

    const request = coordinator.run('a', send('access-1'));
    await flush();
    await coordinator.logout();
    pending.resolve(NEW_TOKENS);
    const result = await request;

    expect(result.kind).toBe('unauthenticated');
    expect(coordinator.snapshot().status).toBe('anonymous');
    expect(memory.current()).toBeNull();
    expect(memory.writes).toEqual(['refresh-0']);
  });

  test('SES-04 expiración con reloj controlado: renueva antes de enviar', async () => {
    // Predicción: al avanzar el reloj 61 s, la primera llamada ya usa el token nuevo y solo hay 1 envío.
    let refreshCalls = 0;
    const { coordinator, clock } = setup(async () => { refreshCalls += 1; return NEW_TOKENS; });
    await coordinator.login({ accessToken: 'access-0', refreshToken: 'refresh-0', expiresInSeconds: 60 });
    const sender = jest.fn(send('access-1'));

    clock.advance(61_000);
    const result = await coordinator.run('a', sender);

    expect(result.kind).toBe('ok');
    expect(refreshCalls).toBe(1);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender).toHaveBeenCalledWith('access-1');
  });

  test('SES-05 límite de reintentos: un segundo 401 no dispara otro refresh', async () => {
    // Predicción: 'unauthorized', refreshCalls = 1, exactamente 2 envíos.
    let refreshCalls = 0;
    const { coordinator } = setup(async () => { refreshCalls += 1; return NEW_TOKENS; });
    await coordinator.login({ accessToken: 'access-0', refreshToken: 'refresh-0', expiresInSeconds: 60 });
    const sender = jest.fn(async () => ({ status: 401 }));

    const result = await coordinator.run('a', sender);

    expect(result.kind).toBe('unauthorized');
    expect(refreshCalls).toBe(1);
    expect(sender).toHaveBeenCalledTimes(2);
  });

  test('SES-06 logs sanitizados: ningún valor de token aparece en los eventos', async () => {
    // Predicción: los logs traen eventos técnicos y números de generación, pero ningún valor de token.
    const { coordinator, logs } = setup(async () => NEW_TOKENS);
    await coordinator.login({ accessToken: 'access-0', refreshToken: 'refresh-0', expiresInSeconds: 60 });
    await coordinator.run('a', send('access-1'));

    const text = JSON.stringify(logs);
    expect(text).toContain('session-refresh-success');
    for (const secret of ['access-0', 'access-1', 'refresh-0', 'refresh-1']) {
      expect(text).not.toContain(secret);
    }
  });
});