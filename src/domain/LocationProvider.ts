export type LocationUnavailableReason =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'http_error'
  | 'invalid_json'
  | 'no_results';

export type LocationLookupResult =
  | Readonly<{ kind: 'found'; candidate: unknown }>
  | Readonly<{ kind: 'unavailable'; reason: LocationUnavailableReason; retryAfterMs?: number }>;

/**
 * Puerto: resuelve un texto de busqueda a un candidato SIN validar.
 * Quien lo usa debe pasar el candidato por selectIncidentLocation.
 */
export interface LocationProvider {
  lookup(query: string): Promise<LocationLookupResult>;
}