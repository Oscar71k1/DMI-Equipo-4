import type { LocationLookupResult, LocationProvider } from '../src/domain/LocationProvider';
import { CachedLocationProvider, DEFAULT_TTL_MS } from '../src/infrastructure/CachedLocationProvider';

const good: LocationLookupResult = {
  kind: 'found',
  candidate: { label: 'Edificio A', latitude: 0, longitude: 0 },
};

function setup(result: LocationLookupResult) {
  let t = 0;
  const lookup = jest.fn(async (_q: string) => result);
  const inner: LocationProvider = { lookup };
  const provider = new CachedLocationProvider({ inner, providerName: 'test', now: () => t });
  return { provider, lookup, advance: (ms: number) => { t += ms; } };
}

describe('CachedLocationProvider', () => {
  it('repite consulta: usa caché y no llama otra vez al proveedor', async () => {
    const { provider, lookup } = setup(good);
    await provider.lookup('Edificio A');
    await provider.lookup('  edificio   a ');
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('al expirar el TTL vuelve a consultar', async () => {
    const { provider, lookup, advance } = setup(good);
    await provider.lookup('Edificio A');
    advance(DEFAULT_TTL_MS + 1);
    await provider.lookup('Edificio A');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['timeout', { kind: 'unavailable', reason: 'timeout' }],
    ['rate_limited', { kind: 'unavailable', reason: 'rate_limited', retryAfterMs: 1000 }],
    ['no_results', { kind: 'unavailable', reason: 'no_results' }],
    ['incompleto', { kind: 'found', candidate: { label: 'X' } }],
    ['coordenadas inválidas', { kind: 'found', candidate: { label: 'X', latitude: 91, longitude: 0 } }],
  ] as [string, LocationLookupResult][])('no cachea: %s', async (_name, result) => {
    const { provider, lookup } = setup(result);
    await provider.lookup('Edificio A');
    await provider.lookup('Edificio A');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('consultas concurrentes iguales hacen una sola llamada', async () => {
    const { provider, lookup } = setup(good);
    await Promise.all([provider.lookup('Edificio A'), provider.lookup('edificio a')]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});