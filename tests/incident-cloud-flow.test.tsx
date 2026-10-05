import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import { createRemoteIncidentClient } from '../src/infrastructure/RemoteIncidentClient';
import type {
  HttpRequest,
  HttpResponse,
  HttpTransport,
} from '../src/domain/HttpTransport';
import { CampusOpsScreen } from '../src/ui/CampusOpsScreen';
import { IncidentCreateForm } from '../src/ui/IncidentCreateForm';

const BASE_URL = 'http://127.0.0.1:4310';
const ACTOR_ID = 'reporter-1';
const SENSITIVE_MARKER = 'dato-sensible-ficticio-unico';

afterEach(async () => {
  await cleanup();
});

function jsonResponse(
  status: number,
  body: unknown,
): HttpResponse {
  return {
    status,
    json: async () => body,
  };
}

function createStubTransport(
  handler: (
    request: HttpRequest,
  ) => Promise<HttpResponse> | HttpResponse,
): HttpTransport {
  return {
    request: async (request) => handler(request),
  };
}

function validPayload() {
  return {
    reporterId: 'reporter-1',
    category: 'electrical',
    description: 'Incidencia ficticia de prueba',
    location: {
      source: 'manual',
      label: 'Lab de pruebas',
    },
    work: {
      assignedTechnicianId: null,
      status: 'open',
    },
  };
}

function okEnvelope(
  id: string,
  status: string,
  payload: Record<string, unknown> | null,
) {
  return {
    id,
    version: 1,
    status,
    payload,
  };
}

function buildCloudActions(transport: HttpTransport) {
  const client = createRemoteIncidentClient({
    transport,
    baseUrl: BASE_URL,
    actorId: ACTOR_ID,
    timeoutMs: 50,
  });

  return {
    listIncidents: async () => {
      const result = await client.listIncidents();

      if (result.ok) {
        return result.items;
      }

      throw new Error('cloud-list-failed');
    },

    getIncidentDetail: async (id: string) => {
      const result = await client.getIncidentDetail(id);

      if (result.ok) {
        return result.incident;
      }

      throw new Error('cloud-detail-failed');
    },

    createIncident: async (
      input: {
        category: string;
        description: string;
        location: string;
      },
      idempotencyKey: string,
    ) => {
      const result = await client.createIncident(
        input,
        idempotencyKey,
      );

      if (result.ok) {
        return result.incident;
      }

      throw new Error('cloud-create-failed');
    },

    checkHealth: async () => 'available' as const,
  };
}

describe(
  'flujo cloud de incidencias — lista, detalle, creación y estados (UI-01, LOG-01)',
  () => {
    test(
      'UI-01 nominal: lista → selecciona → detalle',
      async () => {
        const transport = createStubTransport((request) => {
          if (request.path.endsWith('/v1/incidents')) {
            return jsonResponse(200, {
              items: [
                okEnvelope(
                  'inc-01',
                  'open',
                  validPayload(),
                ),
              ],
            });
          }

          return jsonResponse(
            200,
            okEnvelope(
              'inc-01',
              'open',
              validPayload(),
            ),
          );
        });

        const actions = buildCloudActions(transport);

        const {
          getByTestId,
          getByText,
        } = await render(
          <CampusOpsScreen actions={actions} />,
        );

        await waitFor(() => {
          expect(
            getByTestId('incident-list'),
          ).toBeTruthy();
        });

        await fireEvent.press(
          getByTestId('incident-item-inc-01'),
        );

        await waitFor(() => {
          expect(
            getByTestId('incident-detail-content'),
          ).toBeTruthy();
        });

        expect(
          getByText('Incidencia ficticia de prueba'),
        ).toBeTruthy();
      },
    );

    test(
      'UI-01 failure: payload null muestra un estado seguro',
      async () => {
        const transport = createStubTransport(() =>
          jsonResponse(
            200,
            okEnvelope('inc-02', 'open', null),
          ),
        );

        const actions = buildCloudActions(transport);

        const { getByText } = await render(
          <CampusOpsScreen
            actions={{
              ...actions,
              listIncidents: async () => [],
            }}
          />,
        );

        await waitFor(() => {
          expect(
            getByText(
              'No hay incidencias registradas todavía.',
            ),
          ).toBeTruthy();
        });

        const detailResult =
          await actions
            .getIncidentDetail('inc-02')
            .catch((error: Error) => error);

        expect(detailResult).toBeInstanceOf(Error);

        expect(
          (detailResult as Error).message,
        ).toBe('cloud-detail-failed');
      },
    );

    test(
      'UI-01 failure: timeout de red no se confunde con éxito',
      async () => {
        const transport = createStubTransport(
          (request) =>
            new Promise<HttpResponse>((resolve, reject) => {
              const timer = setTimeout(
                () =>
                  resolve(
                    jsonResponse(200, {
                      items: [],
                    }),
                  ),
                500,
              );

              request.signal?.addEventListener(
                'abort',
                () => {
                  clearTimeout(timer);

                  reject(
                    new DOMException(
                      'aborted',
                      'AbortError',
                    ),
                  );
                },
              );
            }),
        );

        const actions = buildCloudActions(transport);

        await expect(
          actions.listIncidents(),
        ).rejects.toThrow('cloud-list-failed');
      },
    );

    test(
      'UI-01 failure: HTTP 500 produce estado genérico',
      async () => {
        const transport = createStubTransport(() =>
          jsonResponse(500, {
            error: 'server_error ficticio',
          }),
        );

        const actions = buildCloudActions(transport);

        await expect(
          actions.listIncidents(),
        ).rejects.toThrow('cloud-list-failed');
      },
    );

    test(
      'LOG-01 failure: datos sensibles ficticios no aparecen en pantalla',
      async () => {
        const transport = createStubTransport(() =>
          jsonResponse(201, {
            duplicate: false,
          }),
        );

        const actions = buildCloudActions(transport);

        const {
          getByTestId,
          queryByText,
        } = await render(
          <IncidentCreateForm
            createIncident={actions.createIncident}
          />,
        );

        await waitFor(() => {
          expect(
            getByTestId('incident-form-category'),
          ).toBeTruthy();
        });

        await fireEvent.changeText(
          getByTestId('incident-form-category'),
          'electrical',
        );

        await fireEvent.changeText(
          getByTestId('incident-form-description'),
          SENSITIVE_MARKER,
        );

        await fireEvent.changeText(
          getByTestId('incident-form-location'),
          'Lab ficticio',
        );

        await fireEvent.press(
          getByTestId('incident-form-submit'),
        );

        await waitFor(() => {
          expect(
            getByTestId('incident-form-status'),
          ).toHaveTextContent(
            'Ocurrio un problema al cargar la informacion. Intenta de nuevo.',
          );
        });

        expect(
          queryByText(SENSITIVE_MARKER),
        ).toBeNull();
      },
    );

    test(
      'CREATE-01 nominal vía formulario: creación exitosa muestra confirmación',
      async () => {
        const transport = createStubTransport(() =>
          jsonResponse(201, {
            incident: okEnvelope(
              'inc-90',
              'open',
              validPayload(),
            ),
            duplicate: false,
          }),
        );

        const actions = buildCloudActions(transport);

        const {
          getByTestId,
          getByText,
        } = await render(
          <IncidentCreateForm
            createIncident={actions.createIncident}
          />,
        );

        await fireEvent.changeText(
          getByTestId('incident-form-category'),
          'electrical',
        );

        await fireEvent.changeText(
          getByTestId('incident-form-description'),
          'desc ficticia',
        );

        await fireEvent.changeText(
          getByTestId('incident-form-location'),
          'Lab ficticio',
        );

        await fireEvent.press(
          getByTestId('incident-form-submit'),
        );

        await waitFor(() => {
          expect(
            getByText('Incidencia creada.'),
          ).toBeTruthy();
        });
      },
    );
  },
);