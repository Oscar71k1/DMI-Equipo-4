import { selectIncidentLocation } from '../src/domain/selectIncidentLocation';
import { createCourseDoubleProvider, createNominatimProvider } from '../src/infrastructure/GeocodingAdapter';

const UA = 'CampusOps-test/1.0';

function reply(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

function mockFetch(make: () => Response | Promise<Response>) {
  return jest.fn(async (_url: string, _init?: RequestInit) => make());
}

function asFetch(mock: ReturnType<typeof mockFetch>): typeof fetch {
  return mock as unknown as typeof fetch;
}

describe('adaptador de geocodificacion (Nominatim)', () => {
  test('transforma una respuesta valida y el selector la acepta', async () => {
    const mock = mockFetch(() => reply(200, [{ display_name: 'Plaza Central', lat: '19.4326', lon: '-99.1332' }]));
    const result = await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('plaza central');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(selectIncidentLocation(result.candidate, 'manual')).toEqual({
        source: 'provider', label: 'Plaza Central', latitude: 19.4326, longitude: -99.1332,
      });
    }
  });

  test('codifica la consulta y solo envia User-Agent y Accept (nada del backend del curso)', async () => {
    const mock = mockFetch(() => reply(200, []));
    await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('Edificio A & B');
    const [url, init] = mock.mock.calls[0]!;
    expect(url).toContain('q=Edificio%20A%20%26%20B');
    expect(Object.keys(init!.headers as Record<string, string>).sort()).toEqual(['Accept', 'User-Agent']);
  });

  test('una respuesta sin resultados es no disponible', async () => {
    const mock = mockFetch(() => reply(200, []));
    expect(await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('nada')).toEqual({
      kind: 'unavailable', reason: 'no_results',
    });
  });

  test('un resultado con coordenadas invalidas cae a captura manual', async () => {
    const mock = mockFetch(() => reply(200, [{ display_name: 'X', lat: '999', lon: '0' }]));
    const result = await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(selectIncidentLocation(result.candidate, 'Sala 3')).toEqual({ source: 'manual', label: 'Sala 3' });
    }
  });

  test('429 devuelve el Retry-After en milisegundos y no reintenta', async () => {
    const mock = mockFetch(() => reply(429, {}, { 'retry-after': '1' }));
    const result = await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x');
    expect(result).toEqual({ kind: 'unavailable', reason: 'rate_limited', retryAfterMs: 1000 });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test('429 sin Retry-After valido no inventa una espera', async () => {
    const mock = mockFetch(() => reply(429, {}, { 'retry-after': 'pronto' }));
    expect(await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x')).toEqual({
      kind: 'unavailable', reason: 'rate_limited',
    });
  });

  test('un Retry-After enorme se limita a 60 segundos', async () => {
    const mock = mockFetch(() => reply(429, {}, { 'retry-after': '86400' }));
    const result = await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x');
    expect(result).toEqual({ kind: 'unavailable', reason: 'rate_limited', retryAfterMs: 60000 });
  });

  test('un error HTTP es no disponible', async () => {
    const mock = mockFetch(() => reply(500, {}));
    expect(await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x')).toEqual({
      kind: 'unavailable', reason: 'http_error',
    });
  });

  test('un JSON invalido es no disponible', async () => {
    const mock = mockFetch(() => ({
      ok: true, status: 200, headers: { get: () => null }, json: async () => { throw new SyntaxError('JSON roto'); },
    }) as unknown as Response);
    expect(await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x')).toEqual({
      kind: 'unavailable', reason: 'invalid_json',
    });
  });

  test('un rechazo de conexion es no disponible y no lanza', async () => {
    const mock = mockFetch(() => Promise.reject(new Error('sin red')));
    expect(await createNominatimProvider({ userAgent: UA, fetchImpl: asFetch(mock) }).lookup('x')).toEqual({
      kind: 'unavailable', reason: 'network',
    });
  });

  test('el timeout cancela la peticion de verdad', async () => {
    let captured: AbortSignal | null = null;
    const hanging = jest.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      captured = init?.signal ?? null;
      init?.signal?.addEventListener('abort', () => reject(new Error('abortada')));
    }));
    const provider = createNominatimProvider({ userAgent: UA, timeoutMs: 30, fetchImpl: hanging as unknown as typeof fetch });
    expect(await provider.lookup('x')).toEqual({ kind: 'unavailable', reason: 'timeout' });
    expect(captured).not.toBeNull();
    expect((captured as unknown as AbortSignal).aborted).toBe(true);
  });
});

describe('adaptador del doble local del curso', () => {
  const options = { baseUrl: 'http://127.0.0.1:4310', actorId: 'reporter-1', token: 'course-valid-token' };

  test('el cero es valido y se envian las cabeceras del curso solo a este doble', async () => {
    const mock = mockFetch(() => reply(200, { label: 'Origen', latitude: 0, longitude: 0 }));
    const result = await createCourseDoubleProvider({ ...options, fetchImpl: asFetch(mock) }).lookup('origen');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(selectIncidentLocation(result.candidate, 'manual')).toEqual({
        source: 'provider', label: 'Origen', latitude: 0, longitude: 0,
      });
    }
    const [url, init] = mock.mock.calls[0]!;
    expect(url).toBe('http://127.0.0.1:4310/v1/geocoding?q=origen');
    expect((init!.headers as Record<string, string>)['X-Course-Actor']).toBe('reporter-1');
  });

  test('una respuesta incompleta conserva la captura manual', async () => {
    const mock = mockFetch(() => reply(200, { label: 'Parcial' }));
    const result = await createCourseDoubleProvider({ ...options, fetchImpl: asFetch(mock) }).lookup('x');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(selectIncidentLocation(result.candidate, 'Sala 3')).toEqual({ source: 'manual', label: 'Sala 3' });
    }
  });

  test('un cuerpo null es no disponible', async () => {
    const mock = mockFetch(() => reply(200, null));
    expect(await createCourseDoubleProvider({ ...options, fetchImpl: asFetch(mock) }).lookup('x')).toEqual({
      kind: 'unavailable', reason: 'no_results',
    });
  });
});