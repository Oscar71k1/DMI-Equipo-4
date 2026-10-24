import { createIncidentClient } from '../src/api/incidentClient';
import type { HttpTransport } from '../src/domain/HttpTransport';

const KEY = 'week8-op-0001';
const INCIDENT_ID = 'campus-inc-001';
const INPUT = { action: 'start', baseVersion: 1 } as const;

function setup(status: number, body: unknown) {
  type Call = { method: string; path: string; headers?: Record<string, string>; body?: unknown };
  const calls: Call[] = [];
  const transport: HttpTransport = {
    request: async (request) => {
        calls.push(request as Call);
      return { status, json: async () => body };
    },
  };
  const client = createIncidentClient({ transport, baseUrl: 'http://127.0.0.1:4310', timeoutMs: 200 });
  return { client, calls };
}

// payload null mantiene la prueba independiente de las reglas del dominio: aquí solo importa el sobre.
const envelope = (overrides: Record<string, unknown> = {}) => ({
  incident: { id: INCIDENT_ID, version: 2, status: 'in_progress', payload: null },
  operationId: KEY,
  duplicate: false,
  ...overrides,
});

describe('performIncidentAction — confirmación con sobre { incident, operationId, duplicate }', () => {
  test('ACT-01 nominal: acepta el sobre y conserva versión, identidad de la operación y duplicate:false', async () => {
    // Predicción: antes de corregir falla con kind "contract"; después devuelve el sobre validado.
    const { client } = setup(201, envelope());
    const result = await client.performIncidentAction(INCIDENT_ID, INPUT, KEY);
    expect(result.operationId).toBe(KEY);
    expect(result.duplicate).toBe(false);
    expect(result.incident).toEqual({ kind: 'unavailable', id: INCIDENT_ID, status: 'in_progress', version: 2 });
  });

  test('ACT-02 boundary: replay con duplicate:true es una confirmación válida, no un error', async () => {
    // Predicción: HTTP 200 con duplicate true se acepta y conserva la misma identidad.
    const { client } = setup(200, envelope({ duplicate: true }));
    const result = await client.performIncidentAction(INCIDENT_ID, INPUT, KEY);
    expect(result.duplicate).toBe(true);
    expect(result.operationId).toBe(KEY);
  });

  test('ACT-03 la solicitud conserva clave, ruta, método y baseVersion', async () => {
    // Predicción: POST a /v1/incidents/<id>/actions con Idempotency-Key y el cuerpo exacto.
    const { client, calls } = setup(201, envelope());
    await client.performIncidentAction(INCIDENT_ID, INPUT, KEY);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.path).toContain(`/v1/incidents/${INCIDENT_ID}/actions`);
    expect(calls[0]?.headers?.['Idempotency-Key']).toBe(KEY);
    expect(calls[0]?.body).toEqual(INPUT);
  });

  test('ACT-04 failure: un sobre sin operationId no se toma como confirmación', async () => {
    // Predicción: rechaza con kind "contract".
    const { operationId: _omitted, ...withoutOperation } = envelope();
    const { client } = setup(201, withoutOperation);
    await expect(client.performIncidentAction(INCIDENT_ID, INPUT, KEY)).rejects.toMatchObject({ kind: 'contract' });
  });

  test('ACT-05 failure: la confirmación de OTRA operación no se acepta', async () => {
    // Predicción: operationId distinto a la clave enviada se rechaza (no se puede retirar la cola con eso).
    const { client } = setup(201, envelope({ operationId: 'week8-op-9999' }));
    await expect(client.performIncidentAction(INCIDENT_ID, INPUT, KEY)).rejects.toMatchObject({ kind: 'contract' });
  });

  test('ACT-06 failure: la incidencia de la respuesta debe ser la solicitada', async () => {
    // Predicción: un id distinto en la respuesta se rechaza.
    const other = { id: 'campus-inc-999', version: 2, status: 'in_progress', payload: null };
    const { client } = setup(201, envelope({ incident: other }));
    await expect(client.performIncidentAction(INCIDENT_ID, INPUT, KEY)).rejects.toMatchObject({ kind: 'contract' });
  });

  test.each([
    [403, 'http'],
    [409, 'http'],
    [500, 'server'],
  ] as const)('ACT-07 failure: HTTP %i se distingue como "%s" y conserva el status', async (status, kind) => {
    // Predicción: ya funcionaba antes; sirve para no perder estas distinciones al corregir.
    const { client } = setup(status, { code: 'controlled_failure' });
    await expect(client.performIncidentAction(INCIDENT_ID, INPUT, KEY)).rejects.toMatchObject({ kind, status });
  });
});