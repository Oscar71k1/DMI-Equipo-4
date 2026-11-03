import { writeFileSync } from 'node:fs';

import { selectIncidentLocation } from '../src/domain/selectIncidentLocation';
import { CachedLocationProvider } from '../src/infrastructure/CachedLocationProvider';
import { createNominatimProvider } from '../src/infrastructure/GeocodingAdapter';

const QUERY = 'Zocalo, Ciudad de Mexico'; // lugar publico, sin personas ni domicilios privados
const state = { calls: 0, status: null as number | null };

const fetchImpl: typeof fetch = async (input, init) => {
  state.calls += 1;
  const response = await fetch(input, init);
  state.status = response.status;
  return response;
};

async function main(): Promise<void> {
  const provider = new CachedLocationProvider({
    inner: createNominatimProvider({
      userAgent: 'DMI-Equipo-4-Inspecciones/1.0 (floresjarumi312@gmail.com)',
      fetchImpl,
    }),
    providerName: 'nominatim',
  });

  const first = await provider.lookup(QUERY);
  const callsAfterFirst = state.calls;
  const second = await provider.lookup(QUERY);

  const describe = (r: Awaited<ReturnType<typeof provider.lookup>>) =>
    r.kind === 'found'
      ? {
          kind: 'found',
          validForCampusOps: selectIncidentLocation(r.candidate, '_').source === 'provider',
        }
      : { kind: 'unavailable', reason: r.reason };

  const summary = {
    provider: 'nominatim (https://nominatim.openstreetmap.org)',
    generatedAt: new Date().toISOString(),
    command: 'npx tsx tools/week9-real-geocoding.ts',
    query: QUERY,
    httpStatusOfNetworkCall: state.status,
    networkCallsAfterFirstLookup: callsAfterFirst,
    networkCallsAfterSecondLookup: state.calls,
    secondLookupServedFromCache: first.kind === 'found' && state.calls === callsAfterFirst,
    firstResult: describe(first),
    secondResult: describe(second),
    note: 'Resultado sanitizado: sin coordenadas ni etiqueta. Si no hubo coincidencias, se registra tal cual.',
  };

  const text = JSON.stringify(summary, null, 2);
  writeFileSync('reports/week-09/logs/jarumi-consulta-real.txt', text + '\n');
  console.log(text);
}

main().catch((error: unknown) => {
  console.error('Fallo la consulta real:', error instanceof Error ? error.name : 'error');
  process.exit(1);
});