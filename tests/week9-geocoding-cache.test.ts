import { TtlCache, normalizeCacheKey } from '../src/infrastructure/GeocodingCache';

function setup(maxEntries = 100) {
  let t = 0;
  const cache = new TtlCache<{ ok: boolean; n: number }>({
    ttlMs: 24 * 60 * 60 * 1000,
    maxEntries,
    isCacheable: (v) => v.ok,
    now: () => t,
  });
  return { cache, advance: (ms: number) => { t += ms; } };
}

describe('TtlCache', () => {
  it('usa caché antes de vencer y vuelve a consultar al expirar', async () => {
    const { cache, advance } = setup();
    const load = jest.fn(async () => ({ ok: true, n: 1 }));
    await cache.get('a', load);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(1);
    advance(24 * 60 * 60 * 1000 + 1);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('no cachea resultados no válidos', async () => {
    const { cache } = setup();
    const load = jest.fn(async () => ({ ok: false, n: 0 }));
    await cache.get('a', load);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(0);
  });

  it('no cachea rechazos y libera la petición en vuelo', async () => {
    const { cache } = setup();
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ ok: true, n: 2 });
    await expect(cache.get('a', load)).rejects.toThrow('x');
    await expect(cache.get('a', load)).resolves.toEqual({ ok: true, n: 2 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('consultas concurrentes iguales hacen una sola llamada', async () => {
    const { cache } = setup();
    const load = jest.fn(async () => ({ ok: true, n: 3 }));
    const [a, b] = await Promise.all([cache.get('a', load), cache.get('a', load)]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('respeta el máximo de entradas expulsando la más antigua', async () => {
    const { cache } = setup(2);
    const load = jest.fn(async () => ({ ok: true, n: 4 }));
    await cache.get('a', load);
    await cache.get('b', load);
    await cache.get('c', load); // expulsa 'a'
    expect(cache.size).toBe(2);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it('normaliza la clave con proveedor y espacios/mayúsculas', () => {
    expect(normalizeCacheKey('nominatim', '  Edificio  A ')).toBe('nominatim|edificio a');
  });
});