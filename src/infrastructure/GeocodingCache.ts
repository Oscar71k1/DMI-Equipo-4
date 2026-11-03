export type Clock = () => number;

export interface CacheOptions<T> {
  ttlMs: number;
  maxEntries: number;
  isCacheable: (value: T) => boolean;
  now?: Clock;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export function normalizeCacheKey(provider: string, query: string): string {
  return `${provider}|${query.trim().replace(/\s+/g, ' ').toLowerCase()}`;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly isCacheable: (value: T) => boolean;
  private readonly now: Clock;

  constructor(options: CacheOptions<T>) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries;
    this.isCacheable = options.isCacheable;
    this.now = options.now ?? Date.now;
  }

  get size(): number {
    return this.entries.size;
  }

  async get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit) {
      if (hit.expiresAt > this.now()) return hit.value;
      this.entries.delete(key); // vencida: se vuelve a consultar
    }

    const pending = this.inFlight.get(key);
    if (pending) return pending; // una sola petición en vuelo por clave

    const promise = load()
      .then((value) => {
        if (this.isCacheable(value)) this.store(key, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  private store(key: string, value: T): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest); // expulsa la más antigua
    }
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}