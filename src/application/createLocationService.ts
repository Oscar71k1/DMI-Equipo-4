import { selectIncidentLocation, type IncidentLocation, type LocationSearchPort } from '../domain/IncidentLocation';
export type LocationSearch = (query: string, manualLabel: string) => Promise<{
  location: IncidentLocation; cacheHit: boolean;
}>;
export function createLocationService(provider: LocationSearchPort, options: {
  ttlMs?: number; maxEntries?: number; now?: () => number;
} = {}): { search: LocationSearch } {
  const ttl = options.ttlMs ?? 300000;
  const capacity = options.maxEntries ?? 32;
  if (!Number.isFinite(ttl) || ttl <= 0 || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    throw new Error('Invalid location cache configuration');
  }
  const now = options.now ?? Date.now;
  const cache = new Map<string, { value: IncidentLocation; expires: number }>();
  const pending = new Map<string, Promise<unknown>>();
  return { async search(query, manualLabel) {
    const key = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
    if (key.length < 2) return { location: selectIncidentLocation(null, manualLabel), cacheHit: false };
    const hit = cache.get(key);
    if (hit && now() < hit.expires) {
      cache.delete(key); cache.set(key, hit);
      return { location: { ...hit.value }, cacheHit: true };
    }
    cache.delete(key);
    let request = pending.get(key);
    if (!request) {
      // Bound concurrent distinct queries as well as stored entries.
      if (pending.size >= capacity) return { location: selectIncidentLocation(null, manualLabel), cacheHit: false };
      request = Promise.resolve().then(() => provider.search(key)).catch(() => null);
      pending.set(key, request);
    }
    const value = await request;
    if (pending.get(key) === request) pending.delete(key);
    const location = selectIncidentLocation(value, manualLabel);
    if (location.source === 'provider') {
      if (cache.size >= capacity) cache.delete(cache.keys().next().value!);
      cache.set(key, { value: location, expires: now() + ttl });
    }
    return { location, cacheHit: false };
  } };
}
