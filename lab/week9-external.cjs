/* Explicit external smoke check. Not run by Jest/CI: public quota is not a test dependency. */
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  module._compile(output.outputText, filename);
};
const { createGeocodingAdapter } = require('../src/infrastructure/GeocodingAdapter.ts');
const { createLocationService } = require('../src/application/createLocationService.ts');
(async () => {
  let calls = 0;
  const metrics = [];
  const service = createLocationService(createGeocodingAdapter({
    fetchImpl: async (...args) => { calls++; return fetch(...args); },
    retry: { policy: { maxAttempts: 1 } }, onMetrics: value => metrics.push(value),
  }));
  const start = Date.now();
  // A public city is only the reference for an invented incident, never a person's address.
  const result = await service.search('Berlin', 'Edificio ficticio de práctica');
  const cached = await service.search('Berlin', 'Edificio ficticio de práctica');
  const output = { generatedAt: new Date().toISOString(), provider: 'Open-Meteo / GeoNames',
    scenario: 'Synthetic incident using a public locality as approximate reference; no personal data',
    command: 'node lab/week9-external.cjs', source: result.location.source, coordinateValuesOmitted: true,
    cacheHit: cached.cacheHit, httpCalls: calls, durationMs: Date.now() - start, metrics };
  console.log(JSON.stringify(output, null, 2));
  if (result.location.source !== 'provider' || !cached.cacheHit || calls !== 1) process.exitCode = 1;
})().catch(() => { console.error('External smoke unavailable (sanitized)'); process.exitCode = 1; });
