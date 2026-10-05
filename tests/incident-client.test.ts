import { createRemoteIncidentClient } from '../src/infrastructure/RemoteIncidentClient';
import type { HttpRequest, HttpResponse, HttpTransport } from '../src/domain/HttpTransport';

const BASE_URL = 'http://127.0.0.1:4310';
const ACTOR_ID = 'reporter-1';

function okEnvelope(id: string, status: string, payload: Record<string, unknown> | null) {
  return { id, version: 1, status, payload };
}

function validPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    reporterId: 'reporter-1',
    category: 'electrical',
    description: 'Incidencia ficticia de prueba',
    location: { source: 'manual', label: 'Lab de pruebas' },
    work: { assignedTechnicianId: null, status: 'open' },
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): HttpResponse {
  return { status, json: async () => body };
}

function createStubTransport(
  handler: (request: HttpRequest) => Promise<HttpResponse> | HttpResponse,
): HttpTransport & { calls: HttpRequest[] } {
  const calls: HttpRequest[] = [];
  return {
    calls,
    request: async (request) => {
      calls.push(request);
      return handler(request);
    },
  };
}

describe('RemoteIncidentClient — contrato de red real con transporte sustituible', () => {
  test('LIST-01 nominal: HTTP 200 con items visibles mediante el cliente', async () => {
    // Predicción: una respuesta 200 con un item válido debe producir ok:true
    // con un Incident convertido correctamente.
    const transport = createStubTransport(() =>
      jsonResponse(200, { items: [okEnvelope('inc-01', 'open', validPayload())] }),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.listIncidents();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('inc-01');
    }
    expect(transport.calls[0]?.headers?.Authorization).toBe('Bearer course-valid-token');
    expect(transport.calls[0]?.headers?.['X-Course-Actor']).toBe(ACTOR_ID);
  });

  test('LIST-02 boundary: items vacío es una lista válida, no error', async () => {
    // Predicción: { items: [] } debe devolver ok:true con un arreglo vacío,
    // distinto de un error de contrato.
    const transport = createStubTransport(() => jsonResponse(200, { items: [] }));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.listIncidents();

    expect(result).toEqual({ ok: true, items: [] });
  });

  test('LIST-03 failure: items ausente o no-arreglo se rechaza como error de contrato', async () => {
    // Predicción: un cuerpo sin "items" como arreglo debe ser ok:false con
    // error de contrato, no una lista vacía silenciosa.
    const transport = createStubTransport(() => jsonResponse(200, { items: 'no-es-arreglo' }));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.listIncidents();

    expect(result).toEqual({ ok: false, error: { kind: 'contract' } });
  });

  test('DETAIL-01 nominal: el detalle corresponde al id solicitado y la URL lo codifica', async () => {
    // Predicción: la URL debe contener el id solicitado, y el resultado debe
    // corresponder exactamente a ese id.
    const transport = createStubTransport(() => jsonResponse(200, okEnvelope('inc-42', 'open', validPayload())));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.getIncidentDetail('inc-42');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.incident.id).toBe('inc-42');
    expect(transport.calls[0]?.path).toContain('/v1/incidents/inc-42');
  });

  test('payload:null valido se conserva como error unavailable distinguible', async () => {
    const transport = createStubTransport(() =>
      jsonResponse(200, okEnvelope('inc-null', 'assigned', null)),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    await expect(client.getIncidentDetail('inc-null')).resolves.toEqual({
      ok: false,
      error: { kind: 'unavailable' },
    });
  });

  test('DOM-02 failure: sobre válido pero payload de dominio incompleto se rechaza distinguible del parser', async () => {
    // Predicción: un sobre con payload que no cumple las reglas de dominio
    // (sin category) debe devolver error 'domain', distinto de 'contract'.
    const transport = createStubTransport(() =>
      jsonResponse(200, okEnvelope('inc-43', 'open', validPayload({ category: undefined }))),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.getIncidentDetail('inc-43');

    expect(result).toEqual({ ok: false, error: { kind: 'domain' } });
  });
    test('DOM-01 nominal: DTO completo valido se convierte al modelo de dominio sin campos remotos extra', async () => {
    // Prediccion: un sobre valido con un campo remoto adicional en el payload
    // debe convertirse en un Incident con exactamente los 7 campos del dominio,
    // sin copiar el campo extra.
    const transport = createStubTransport(() =>
      jsonResponse(200, okEnvelope('inc-41', 'open', validPayload({ campoRemotoExtra: 'no-debe-pasar' }))),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.getIncidentDetail('inc-41');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.incident).toEqual({
        id: 'inc-41',
        reporterId: 'reporter-1',
        category: 'electrical',
        description: 'Incidencia ficticia de prueba',
        location: { source: 'manual', label: 'Lab de pruebas' },
        status: 'open',
        work: { assignedTechnicianId: null, status: 'open' },
      });
      expect(result.incident).not.toHaveProperty('campoRemotoExtra');
    }
  });
  test('CREATE-01 nominal: POST válido con clave de idempotencia produce 201 y refleja la creación', async () => {
    // Predicción: una creación válida debe producir ok:true, duplicate:false,
    // y enviar el header Idempotency-Key.
    const transport = createStubTransport(() =>
      jsonResponse(201, { incident: okEnvelope('inc-50', 'open', validPayload()), duplicate: false }),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.createIncident(
      { category: 'electrical', description: 'desc ficticia', location: 'Lab ficticio' },
      'idem-key-001',
    );

    expect(result).toEqual({
      ok: true,
      incident: expect.objectContaining({ id: 'inc-50' }),
      duplicate: false,
    });
    expect(transport.calls[0]?.headers?.['Idempotency-Key']).toBe('idem-key-001');
  });

  test('CREATE-02 boundary: misma clave en un replay no duplica, duplicate:true', async () => {
    // Predicción: al repetir la misma operación con la misma clave, el cliente
    // debe reflejar duplicate:true sin tratarlo como error.
    const transport = createStubTransport(() =>
      jsonResponse(200, { incident: okEnvelope('inc-50', 'open', validPayload()), duplicate: true }),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.createIncident(
      { category: 'electrical', description: 'desc ficticia', location: 'Lab ficticio' },
      'idem-key-001',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.duplicate).toBe(true);
  });

  test('CREATE-03 failure: envoltorio de respuesta corrupto no declara creación exitosa', async () => {
    // Predicción: una respuesta 201 sin el campo "incident" debe ser ok:false
    // con error de contrato, nunca un éxito falso.
    const transport = createStubTransport(() => jsonResponse(201, { duplicate: false }));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.createIncident(
      { category: 'electrical', description: 'desc ficticia', location: 'Lab ficticio' },
      'idem-key-002',
    );

    expect(result).toEqual({ ok: false, error: { kind: 'contract' } });
  });

  test('NET-01 failure: JSON inválido produce error de decodificación sin cuerpo crudo', async () => {
    // Predicción: si response.json() rechaza, el cliente debe devolver un
    // error 'decode' controlado, sin propagar la excepción cruda.
    const transport = createStubTransport(() => ({
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token in JSON ficticio');
      },
    }));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.listIncidents();

    expect(result).toEqual({ ok: false, error: { kind: 'decode' } });
  });

  test('NET-02 failure: demora superior al timeout produce error de timeout y aborta la petición', async () => {
    // Predicción: con un timeout de 50ms y un transporte que tarda 500ms,
    // el cliente debe resolver con error 'timeout' sin esperar la respuesta tardía.
    const transport = createStubTransport(
      (request) =>
        new Promise<HttpResponse>((resolve, reject) => {
          const timer = setTimeout(() => resolve(jsonResponse(200, { items: [] })), 500);
          request.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID, timeoutMs: 50 });

    const result = await client.listIncidents();

    expect(result).toEqual({ ok: false, error: { kind: 'timeout' } });
  });

  test('NET-03 failure: HTTP 500 es distinguible de timeout y de formato inválido', async () => {
    // Predicción: una respuesta 500 debe producir error 'server-error' con el
    // código real, no confundirse con timeout ni decode.
    const transport = createStubTransport(() => jsonResponse(500, { error: 'server_error ficticio' }));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.listIncidents();

    expect(result).toEqual({ ok: false, error: { kind: 'server-error', status: 500 } });
  });

  test('NET-04 failure: el transporte rechaza por desconexión y produce un error de red controlado', async () => {
    // Predicción: si el transporte rechaza la promesa (desconexión real),
    // el cliente debe devolver error 'network-error' controlado, sin
    // mostrar el mensaje arbitrario de la excepción original.
    const transport = createStubTransport(() => Promise.reject(new Error('network down ficticio')));
    const client = createRemoteIncidentClient({ transport, baseUrl: BASE_URL, actorId: ACTOR_ID });

    const result = await client.listIncidents();

    expect(result).toEqual({ ok: false, error: { kind: 'network-error' } });
  });
});
