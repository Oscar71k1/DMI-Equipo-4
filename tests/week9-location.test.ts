import { selectIncidentLocation } from '../src/domain/IncidentLocation';
import { createLocationService } from '../src/application/createLocationService';
import { createGeocodingAdapter } from '../src/infrastructure/GeocodingAdapter';
import { createRetryPolicy, parseRetryAfter } from '../src/application/retryPolicy';
import { createRetryExecutor } from '../src/application/retryExecutor';
const valid = { label: 'Zona ficticia', latitude: 0, longitude: 0 };
test('location contract accepts boundaries and zero, rejects incomplete, incorrect types and errors without mutation', () => {
  for (const [latitude, longitude] of [[0, 0], [-90, -180], [90, 180]]) {
    const input = Object.freeze({ ...valid, latitude, longitude });
    expect(selectIncidentLocation(input, 'Manual')).toEqual({ source: 'provider', ...input });
  }
  for (const input of [null, [], { status: 429 }, { label: 'Incompleto' }, { ...valid, error: 'unavailable' },
    { ...valid, latitude: 91 }, { ...valid, longitude: -181 }, { ...valid, latitude: NaN },
    { ...valid, latitude: Infinity }, { ...valid, latitude: '0' }, { ...valid, label: ' ' }]) {
    expect(selectIncidentLocation(input, 'Edificio manual')).toEqual({ source: 'manual', label: 'Edificio manual' });
  }
});
test('cache hits, TTL expiry, LRU bound, coalescing, invalid results not cached', async () => {
  let time = 0;
  const provider = { search: jest.fn(async () => valid as unknown) };
  const service = createLocationService(provider, { now: () => time, ttlMs: 10, maxEntries: 2 });
  await Promise.all([service.search(' Zona  A ', 'Manual'), service.search('zona a', 'Manual')]);
  expect(provider.search).toHaveBeenCalledTimes(1);
  expect((await service.search('zona a', 'Manual')).cacheHit).toBe(true);
  time = 11; await service.search('zona a', 'Manual');
  expect(provider.search).toHaveBeenCalledTimes(2);
  await service.search('zona b', 'Manual'); await service.search('zona c', 'Manual'); await service.search('zona a', 'Manual');
  expect(provider.search).toHaveBeenCalledTimes(5);
  provider.search.mockResolvedValue(null);
  await service.search('zona d', 'Manual'); await service.search('zona d', 'Manual');
  expect(provider.search).toHaveBeenCalledTimes(7);
  console.info('WEEK09_OBSERVATION ' + JSON.stringify({ id: 'cache', calls: 7, initialConcurrentCalls: 1, ttlMs: 10, capacity: 2 }));
});
test.each(['incomplete', 'invalid', 'disconnect', 'malformed', 'timeout', '429'])('adapter failure %s preserves manual fallback', async kind => {
  let count = 0; const metrics: unknown[] = [];
  const fetchImpl = jest.fn(async (_url: unknown, init?: RequestInit) => {
    count++;
    if (kind === 'disconnect') throw new TypeError('Network unavailable');
    if (kind === 'timeout') return new Promise<Response>((_, reject) =>
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), { once: true }));
    return { ok: kind !== '429', status: kind === '429' ? 429 : 200,
      headers: { get: () => kind === '429' ? '1' : null }, json: async () => {
        if (kind === 'malformed') throw new SyntaxError();
        return kind === 'incomplete' ? { label: 'Zona' } : { ...valid, latitude: 91 };
      } } as unknown as Response;
  }) as unknown as typeof fetch;
  const service = createLocationService(createGeocodingAdapter({ fetchImpl, format: 'course',
    retry: { maxTimeoutMs: 10, sleepFn: async () => undefined, policy: { maxAttempts: 2 } }, onMetrics: m => metrics.push(m) }));
  expect((await service.search('Zona de prueba', 'Edificio manual')).location).toEqual({ source: 'manual', label: 'Edificio manual' });
  expect(count).toBe(kind === 'timeout' || kind === '429' ? 2 : 1);
  console.info('WEEK09_OBSERVATION ' + JSON.stringify({ id: kind, calls: count, source: 'manual', metrics, clock: 'real timeout; injected sleep' }));
});
test('Open-Meteo adapter maps results and does not send course credentials to third party', async () => {
  const fetcher = jest.fn(async () => ({ ok: true, json: async () => ({ results: [{ name: 'Referencia', latitude: 0, longitude: 0 }] }) })) as unknown as jest.MockedFunction<typeof fetch>;
  const adapter = createGeocodingAdapter({ fetchImpl: fetcher, headers: { Authorization: 'fixture-not-for-third-party' } });
  expect(await adapter.search('Referencia')).toEqual({ label: 'Referencia', latitude: 0, longitude: 0 });
  expect(fetcher.mock.calls[0]?.[1]?.headers).toBeUndefined();
});
test('retry policy has validated configurable limits and never shortens Retry-After', () => {
  expect(() => createRetryPolicy({ maxAttempts: 5 })).toThrow();
  expect(() => createRetryPolicy({ baseDelayMs: NaN })).toThrow();
  const plan = createRetryPolicy({ maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 1000 });
  expect(plan({ method: 'GET', status: 429, attempt: 1, retryAfterMs: 800.1 }).delayMs).toBe(801);
  expect(plan({ method: 'GET', status: 429, attempt: 1, retryAfterMs: 1001 }).retry).toBe(false);
  for (const attempt of [0, 1.5, 2, 4, Infinity, NaN]) expect(plan({ method: 'GET', status: 503, attempt }).retry).toBe(false);
  expect(parseRetryAfter('1')).toBe(1000);
  expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:02 GMT', 1000)).toBe(1000);
  expect(parseRetryAfter('-1')).toBeUndefined();
});
test('executor caps attempts, enforces wall-time timeout even if transport ignores abort, and stops contract errors', async () => {
  const never = jest.fn(() => new Promise<never>(() => undefined));
  const execution = await createRetryExecutor({ maxTimeoutMs: 5, sleepFn: async () => undefined }).execute({ method: 'GET', operation: never });
  expect(never).toHaveBeenCalledTimes(4);
  expect(execution.metrics[3]?.stopReason).toBe('max_attempts');
  const invalid = jest.fn(async () => { throw { kind: 'contract' }; });
  expect((await createRetryExecutor().execute({ method: 'GET', operation: invalid })).metrics).toHaveLength(1);
  console.info('WEEK09_OBSERVATION ' + JSON.stringify({ id: 'bounded-retries', metrics: execution.metrics, calls: never.mock.calls.length }));
});
