import type { LocationLookupResult, LocationProvider } from '../domain/LocationProvider';
import { selectIncidentLocation } from '../domain/selectIncidentLocation';
import { TtlCache, normalizeCacheKey, type Clock } from './GeocodingCache';

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_ENTRIES = 100;

export interface CachedLocationProviderOptions {
  inner: LocationProvider;
  providerName: string;
  ttlMs?: number;
  maxEntries?: number;
  now?: Clock;
}

function isValidFound(result: LocationLookupResult): boolean {
  return (
    result.kind === 'found' &&
    selectIncidentLocation(result.candidate, '_').source === 'provider'
  );
}

export class CachedLocationProvider implements LocationProvider {
  private readonly cache: TtlCache<LocationLookupResult>;

  constructor(private readonly options: CachedLocationProviderOptions) {
    this.cache = new TtlCache<LocationLookupResult>({
      ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
      maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
      isCacheable: isValidFound,
            ...(options.now === undefined ? {} : { now: options.now }),
    });
  }

  lookup(query: string): Promise<LocationLookupResult> {
    if (query.trim() === '') return this.options.inner.lookup(query);
    const key = normalizeCacheKey(this.options.providerName, query);
    return this.cache.get(key, () => this.options.inner.lookup(query));
  }
}