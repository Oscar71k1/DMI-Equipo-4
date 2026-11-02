import type { LocationLookupResult, LocationProvider } from '../domain/LocationProvider';

export type GeocodingAdapterConfig = Readonly<{
  buildUrl: (query: string) => string;
  /** Devuelve el candidato (sin validar) o null si no hay resultados. */
  parseBody: (body: unknown) => unknown;
  headers?: Readonly<Record<string, string>>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_RETRY_AFTER_MS = 60_000;

function parseRetryAfterMs(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (value.trim() === '' || !Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

export function createGeocodingAdapter(config: GeocodingAdapterConfig): LocationProvider {
  const fetcher = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async lookup(query: string): Promise<LocationLookupResult> {
      const controller = new AbortController();
      let timedOut = false;
      const handle = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      try {
        let response: Response;
        try {
          response = await fetcher(config.buildUrl(query), {
            method: 'GET',
            signal: controller.signal,
            ...(config.headers ? { headers: { ...config.headers } } : {}),
          });
        } catch {
          return { kind: 'unavailable', reason: timedOut ? 'timeout' : 'network' };
        }
        if (response.status === 429) {
          const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
          return retryAfterMs === undefined
            ? { kind: 'unavailable', reason: 'rate_limited' }
            : { kind: 'unavailable', reason: 'rate_limited', retryAfterMs };
        }
        if (!response.ok) return { kind: 'unavailable', reason: 'http_error' };
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          return { kind: 'unavailable', reason: timedOut ? 'timeout' : 'invalid_json' };
        }
        const candidate = config.parseBody(body);
        return candidate === null
          ? { kind: 'unavailable', reason: 'no_results' }
          : { kind: 'found', candidate };
      } finally {
        clearTimeout(handle);
      }
    },
  };
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

function toNumberIfText(value: unknown): unknown {
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
}

export function buildNominatimUrl(query: string, baseUrl: string = NOMINATIM_BASE_URL): string {
  return `${baseUrl}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`;
}

/** Nominatim responde con un arreglo; lat y lon llegan como texto. */
export function parseNominatimBody(body: unknown): unknown {
  if (!Array.isArray(body) || body.length === 0) return null;
  const first: unknown = body[0];
  if (typeof first !== 'object' || first === null) return null;
  const { display_name: label, lat, lon } = first as Record<string, unknown>;
  return { label, latitude: toNumberIfText(lat), longitude: toNumberIfText(lon) };
}

/** El doble del curso responde directamente { label, latitude, longitude }. */
export function parseCourseDoubleBody(body: unknown): unknown {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? body : null;
}

export type NominatimOptions = Readonly<{
  /** Identifica tu aplicacion, como pide la politica de uso del servicio. */
  userAgent: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;

export function createNominatimProvider(options: NominatimOptions): LocationProvider {
  return createGeocodingAdapter({
    buildUrl: (query) => buildNominatimUrl(query, options.baseUrl),
    parseBody: parseNominatimBody,
    // Al servicio externo solo van estas cabeceras: nunca las del backend del curso.
    headers: { 'User-Agent': options.userAgent, Accept: 'application/json' },
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
  });
}

export type CourseDoubleOptions = Readonly<{
  baseUrl: string;
  actorId: string;
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;

export function createCourseDoubleProvider(options: CourseDoubleOptions): LocationProvider {
  return createGeocodingAdapter({
    buildUrl: (query) => `${options.baseUrl}/v1/geocoding?q=${encodeURIComponent(query)}`,
    parseBody: parseCourseDoubleBody,
    headers: { Authorization: `Bearer ${options.token}`, 'X-Course-Actor': options.actorId },
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
  });
}