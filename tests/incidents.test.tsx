import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createHealthQuery } from '../src/application/createHealthQuery';
import { createIncidentQueries } from '../src/application/createIncidentQueries';
import type { Incident } from '../src/domain/Incident';
import type { IncidentRepository } from '../src/domain/IncidentRepository';
import { createInMemoryIncidentRepository } from '../src/infrastructure/InMemoryIncidentRepository';
import { CampusOpsScreen } from '../src/ui/CampusOpsScreen';
import { IncidentDetailScreen } from '../src/ui/IncidentDetailScreen';
import { IncidentListScreen } from '../src/ui/IncidentListScreen';

const sampleIncidents: readonly Incident[] = [
  {
    id: 'a1',
    reporterId: 'reporter-1',
    category: 'electrical',
    description: 'Primera incidencia de prueba',
    location: { source: 'manual', label: 'Lab A' },
    status: 'open',
    work: { assignedTechnicianId: null, status: 'open' },
  },
  {
    id: 'a2',
    reporterId: 'reporter-2',
    category: 'water',
    description: 'Segunda incidencia de prueba',
    location: { source: 'manual', label: 'Lab B' },
    status: 'assigned',
    work: { assignedTechnicianId: 'tech-01', status: 'assigned' },
  },
];

function buildActions(repository: IncidentRepository) {
  const queries = createIncidentQueries(repository);
  return {
    listIncidents: queries.listIncidents,
    getIncidentDetail: queries.getIncidentDetail,
    checkHealth: () => Promise.resolve('available' as const),
  };
}

describe('esqueleto de lista/detalle de incidencias', () => {
  test('lista, selecciona una incidencia, muestra su detalle y permite regresar', async () => {
    // Predicción: al tocar la primera incidencia, se mostrará su descripción y ubicación;
    // al presionar "volver", la lista se muestra de nuevo.
    const repository = createInMemoryIncidentRepository(sampleIncidents);
    const actions = buildActions(repository);

    await render(<CampusOpsScreen actions={actions} />);

    await waitFor(() => expect(screen.getByTestId('incident-list')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('incident-item-a1'));

    await waitFor(() => expect(screen.getByTestId('incident-detail-content')).toBeTruthy());
    expect(screen.getByText('Primera incidencia de prueba')).toBeTruthy();
    expect(screen.getByText('Lab A')).toBeTruthy();
    expect(screen.getByText('Electricidad')).toBeTruthy();
    expect(screen.getByText('Estado: Abierta')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('incident-detail-back'));
    await waitFor(() => expect(screen.getByTestId('incident-list')).toBeTruthy());
  });

  test('seleccionar una incidencia distinta muestra datos distintos, no siempre el primero', async () => {
    // Predicción: seleccionar la segunda incidencia debe mostrar su propia descripción,
    // no la de la primera.
    const repository = createInMemoryIncidentRepository(sampleIncidents);
    const actions = buildActions(repository);

    await render(<CampusOpsScreen actions={actions} />);
    await waitFor(() => expect(screen.getByTestId('incident-list')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('incident-item-a2'));
    await waitFor(() => expect(screen.getByTestId('incident-detail-content')).toBeTruthy());
    expect(screen.getByText('Segunda incidencia de prueba')).toBeTruthy();
    expect(screen.getByText('Lab B')).toBeTruthy();
    expect(screen.queryByText('Primera incidencia de prueba')).toBeNull();
  });

  test('lista vacía muestra el mensaje acordado, sin cerrarse', async () => {
    // Predicción: con un repositorio sin registros, se mostrará
    // "No hay incidencias registradas todavía.".
    const repository = createInMemoryIncidentRepository([]);
    const actions = buildActions(repository);

    await render(<CampusOpsScreen actions={actions} />);

    await waitFor(() =>
      expect(screen.getByText('No hay incidencias registradas todavía.')).toBeTruthy(),
    );
  });

  test('un identificador inexistente devuelve null y la UI muestra "no encontrada"', async () => {
    // Predicción: getIncidentDetail('no-existe') resolverá null en aplicación,
    // y la UI mostrará el mensaje de "no encontrada" en vez de inventar datos.
    const repository = createInMemoryIncidentRepository(sampleIncidents);
    const actions = buildActions(repository);

    const result = await actions.getIncidentDetail('no-existe');
    expect(result).toBeNull();

    await render(
      <IncidentDetailScreen
        incidentId="no-existe"
        getIncidentDetail={actions.getIncidentDetail}
        onBack={() => {}}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText('No se encontró la incidencia solicitada.')).toBeTruthy(),
    );
  });

  test('sustituir el repositorio cambia los datos observados sin tocar UI ni application', async () => {
    // Predicción: al cambiar el repositorio inyectado, espero ver el nuevo título
    // sin tocar la pantalla.
    const originalRepository = createInMemoryIncidentRepository(sampleIncidents);
    const substituteIncidents: readonly Incident[] = [
      {
        id: 'b1',
        reporterId: 'reporter-3',
        category: 'safety',
        description: 'Incidencia del proveedor sustituto',
        location: { source: 'manual', label: 'Lab C' },
        status: 'open',
        work: { assignedTechnicianId: null, status: 'open' },
      },
    ];
    // Implementacion independiente del fake de infraestructura; respeta el mismo puerto.
    const substituteRepository: IncidentRepository = {
      list: jest.fn(async () => substituteIncidents),
      getById: jest.fn(
        async (id: string) => substituteIncidents.find((item) => item.id === id) ?? null,
      ),
    };

    const originalList = await createIncidentQueries(originalRepository).listIncidents();
    const substituteList = await createIncidentQueries(substituteRepository).listIncidents();

    expect(originalList.map((i) => i.id)).toEqual(['a1', 'a2']);
    expect(substituteList.map((i) => i.id)).toEqual(['b1']);

    const actions = buildActions(substituteRepository);
    await render(<CampusOpsScreen actions={actions} />);
    await waitFor(() =>
      expect(screen.getByText('Incidencia del proveedor sustituto')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('incident-item-b1'));
    expect(screen.getByText('Lab C')).toBeTruthy();
    expect(substituteRepository.list).toHaveBeenCalled();
    expect(substituteRepository.getById).toHaveBeenCalledWith('b1');
  });

  test('un proveedor que rechaza la consulta muestra un mensaje de error controlado', async () => {
    // Predicción: si list() rechaza la promesa, la UI mostrará el mensaje de error,
    // sin dejar una promesa rechazada sin manejar.
    const failingRepository: IncidentRepository = {
      list: () => Promise.reject(new Error('fallo simulado del proveedor')),
      getById: () => Promise.reject(new Error('fallo simulado del proveedor')),
    };
    const actions = buildActions(failingRepository);

    await render(<CampusOpsScreen actions={actions} />);

    await waitFor(() =>
      expect(
        screen.getByText('Ocurrió un problema al cargar la información. Intenta de nuevo.'),
      ).toBeTruthy(),
    );
  });

  test('un error del detalle conserva la opcion de regresar a la lista', async () => {
    const repository: IncidentRepository = {
      list: async () => sampleIncidents,
      getById: async () => {
        throw new Error('detalle no disponible');
      },
    };
    await render(<CampusOpsScreen actions={buildActions(repository)} />);
    await fireEvent.press(screen.getByTestId('incident-item-a1'));
    expect(screen.getByTestId('incident-detail-status').props.children).toContain(
      'Ocurrió un problema',
    );
    await fireEvent.press(screen.getByTestId('incident-detail-back'));
    expect(screen.getByTestId('incident-list')).toBeTruthy();
  });

  test('la lista ficticia funciona cuando el puerto de salud falla', async () => {
    const health = createHealthQuery({
      check: async () => {
        throw new Error('sin servidor');
      },
    });
    const actions = {
      ...buildActions(createInMemoryIncidentRepository(sampleIncidents)),
      ...health,
    };
    await render(<CampusOpsScreen actions={actions} />);
    expect(screen.getByTestId('backend-status').props.children.join('')).toContain('offline');
    await fireEvent.press(screen.getByTestId('incident-item-a2'));
    expect(screen.getByText('Lab B')).toBeTruthy();
  });

  test('al cambiar de identificador se oculta el detalle anterior mientras llega el nuevo', async () => {
    let resolveDetail!: (incident: Incident | null) => void;
    const delayedDetail = new Promise<Incident | null>((resolve) => {
      resolveDetail = resolve;
    });
    const getDetail = (id: string) =>
      id === 'a1' ? Promise.resolve(sampleIncidents[0] ?? null) : delayedDetail;
    const view = await render(
      <IncidentDetailScreen incidentId="a1" getIncidentDetail={getDetail} onBack={() => {}} />,
    );
    expect(screen.getByText('Primera incidencia de prueba')).toBeTruthy();
    await view.rerender(
      <IncidentDetailScreen incidentId="a2" getIncidentDetail={getDetail} onBack={() => {}} />,
    );
    expect(screen.queryByText('Primera incidencia de prueba')).toBeNull();
    expect(screen.getByText('Cargando incidencia…')).toBeTruthy();
    await act(async () => {
      resolveDetail(sampleIncidents[1] ?? null);
    });
    expect(screen.getByText('Segunda incidencia de prueba')).toBeTruthy();
  });

  test('al sustituir la consulta de lista se ocultan los datos del proveedor anterior', async () => {
    let resolveList!: (incidents: readonly Incident[]) => void;
    const delayedList = new Promise<readonly Incident[]>((resolve) => {
      resolveList = resolve;
    });
    const view = await render(
      <IncidentListScreen listIncidents={async () => sampleIncidents} onSelect={() => {}} />,
    );
    expect(screen.getByText('Primera incidencia de prueba')).toBeTruthy();
    await view.rerender(
      <IncidentListScreen listIncidents={() => delayedList} onSelect={() => {}} />,
    );
    expect(screen.queryByText('Primera incidencia de prueba')).toBeNull();
    expect(screen.getByText('Cargando incidencias…')).toBeTruthy();
    await act(async () => {
      resolveList([]);
    });
    expect(screen.getByText('No hay incidencias registradas todavía.')).toBeTruthy();
  });

  test('el fake conserva sus datos aunque se modifiquen los datos iniciales o una respuesta', async () => {
    const seed = [
      {
        ...sampleIncidents[0]!,
        location: { source: 'manual' as const, label: 'Ubicación inicial' },
      },
    ];
    const repository = createInMemoryIncidentRepository(seed);
    seed[0]!.location.label = 'Entrada modificada';
    seed.length = 0;
    const result = await repository.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.location.label).toBe('Ubicación inicial');
    // Simula un consumidor JavaScript: readonly no protege objetos en ejecucion.
    Object.assign(result[0]!.location, { label: 'Respuesta modificada' });
    const detail = await repository.getById('a1');
    expect(detail?.location.label).toBe('Ubicación inicial');
    Object.assign(detail!.work, { status: 'closed' });
    expect((await repository.getById('a1'))?.work.status).toBe('open');
  });
});
