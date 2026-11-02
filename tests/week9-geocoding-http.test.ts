import { createGeocodingAdapter } from '../src/infrastructure/GeocodingAdapter';
import { createLocationService } from '../src/application/createLocationService';
import { startBackend, transport } from './helpers/week8';
test('published course geocoding variants cross HTTP adapter and manual selector', async () => {
  const backend = await startBackend();
  try {
    const observed: { scenario: string; source: string }[] = [];
    for (const scenario of ['success', 'incomplete', 'invalid_coordinates', 'malformed', 'slow', 'rate_limited']) {
      const fetcher = (async (url: string, init: RequestInit) => {
        const response = await transport(() => scenario).request({ method: 'GET', path: url,
          headers: { Authorization: 'Bearer course-valid-token', 'X-Course-Actor': 'reporter-1' },
          ...(init.signal ? { signal: init.signal } : {}) });
        return { ok: response.status >= 200 && response.status < 300, status: response.status,
          headers: { get: (name: string) => response.headers?.[name] ?? null }, json: response.json };
      }) as unknown as typeof fetch;
      const service = createLocationService(createGeocodingAdapter({ endpoint: backend.url + '/v1/geocoding', format: 'course',
        fetchImpl: fetcher, retry: { maxTimeoutMs: 100, policy: { maxAttempts: 1 } } }));
      const result = await service.search('Consulta ficticia', 'Edificio manual');
      expect(result.location.source).toBe(scenario === 'success' ? 'provider' : 'manual');
      if (result.location.source === 'manual') expect(result.location).toEqual({ source: 'manual', label: 'Edificio manual' });
      observed.push({ scenario, source: result.location.source });
    }
    console.info('WEEK09_OBSERVATION ' + JSON.stringify({ id: 'course-geocoding-http', observed }));
  } finally { backend.close(); }
}, 15000);
