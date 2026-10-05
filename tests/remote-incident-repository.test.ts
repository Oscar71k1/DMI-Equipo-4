import { IncidentClientError } from '../src/api/incidentClient';
import { createRemoteIncidentRepository } from '../src/infrastructure/RemoteIncidentRepository';
import type { HttpTransport } from '../src/domain/HttpTransport';

function nullableTransport(): HttpTransport {
  return {
    request: async () => ({
      status: 200,
      json: async () => ({ id: 'inc-null', version: 1, status: 'assigned', payload: null }),
    }),
  };
}

describe('RemoteIncidentRepository — payload null en el flujo de producción', () => {
  test('detalle propaga unavailable tipado en vez de contrato inválido', async () => {
    const repository = createRemoteIncidentRepository({
      transport: nullableTransport(),
      baseUrl: 'http://127.0.0.1:4310',
      actorId: 'reporter-1',
    });

    await expect(repository.getById('inc-null')).rejects.toMatchObject<Partial<IncidentClientError>>({
      kind: 'unavailable',
    });
  });

  test('la lista tampoco convierte una incidencia unavailable en error de contrato', async () => {
    const repository = createRemoteIncidentRepository({
      transport: {
        request: async () => ({
          status: 200,
          json: async () => ({
            items: [{ id: 'inc-null', version: 1, status: 'assigned', payload: null }],
          }),
        }),
      },
      baseUrl: 'http://127.0.0.1:4310',
      actorId: 'reporter-1',
    });

    await expect(repository.list()).rejects.toMatchObject<Partial<IncidentClientError>>({
      kind: 'unavailable',
    });
  });
});
