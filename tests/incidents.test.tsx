import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createIncidentQueries } from '../src/application/createIncidentQueries';
import type { Incident } from '../src/domain/Incident';
import type { IncidentRepository } from '../src/domain/IncidentRepository';
import { createInMemoryIncidentRepository } from '../src/infrastructure/InMemoryIncidentRepository';
import { CampusOpsScreen } from '../src/ui/CampusOpsScreen';
import { IncidentDetailScreen } from '../src/ui/IncidentDetailScreen';

const sampleIncidents: readonly Incident[] = [
  {
    id: 'a1',
    category: 'electrical',
    description: 'Primera incidencia de prueba',
    location: { source: 'manual', label: 'Lab A' },
    status: 'open',
    work: { assignedTechnicianId: null, status: 'open' },
  },
  {
    id: 'a2',
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

    render(<CampusOpsScreen actions={actions} />);

    await waitFor(() => expect(screen.getByTestId('incident-list')).toBeTruthy());
    fireEvent.press(screen.getByTestId('incident-item-a1'));

    await waitFor(() => expect(screen.getByTestId('incident-detail-content')).toBeTruthy());
    expect(screen.getByText('Primera incidencia de prueba')).toBeTruthy();

    fireEvent.press(screen.getByTestId('incident-detail-back'));
    await waitFor(() => expect(screen.getByTestId('incident-list')).toBeTruthy());
  });

  test('seleccionar una incidencia distinta muestra datos distintos, no siempre el primero', async () => {
    // Predicción: seleccionar la segunda incidencia debe mostrar su propia descripción,
    // no la de la primera.
    const repository = createInMemoryIncidentRepository(sampleIncidents);
    const actions = buildActions(repository);

    render(<CampusOpsScreen actions={actions} />);
    await waitFor(() => expect(screen.getByTestId('incident-list')).toBeTruthy());

    fireEvent.press(screen.getByTestId('incident-item-a2'));
    await waitFor(() => expect(screen.getByTestId('incident-detail-content')).toBeTruthy());
    expect(screen.getByText('Segunda incidencia de prueba')).toBeTruthy();
  });

  test('lista vacía muestra el mensaje acordado, sin cerrarse', async () => {
    // Predicción: con un repositorio sin registros, se mostrará
    // "No hay incidencias registradas todavía.".
    const repository = createInMemoryIncidentRepository([]);
    const actions = buildActions(repository);

    render(<CampusOpsScreen actions={actions} />);

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

    render(
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
        category: 'safety',
        description: 'Incidencia del proveedor sustituto',
        location: { source: 'manual', label: 'Lab C' },
        status: 'open',
        work: { assignedTechnicianId: null, status: 'open' },
      },
    ];
    const substituteRepository = createInMemoryIncidentRepository(substituteIncidents);

    const originalList = await createIncidentQueries(originalRepository).listIncidents();
    const substituteList = await createIncidentQueries(substituteRepository).listIncidents();

    expect(originalList.map((i) => i.id)).toEqual(['a1', 'a2']);
    expect(substituteList.map((i) => i.id)).toEqual(['b1']);

    const actions = buildActions(substituteRepository);
    render(<CampusOpsScreen actions={actions} />);
    await waitFor(() =>
      expect(screen.getByText('Incidencia del proveedor sustituto')).toBeTruthy(),
    );
  });

  test('un proveedor que rechaza la consulta muestra un mensaje de error controlado', async () => {
    // Predicción: si list() rechaza la promesa, la UI mostrará el mensaje de error,
    // sin dejar una promesa rechazada sin manejar.
    const failingRepository: IncidentRepository = {
      list: () => Promise.reject(new Error('fallo simulado del proveedor')),
      getById: () => Promise.reject(new Error('fallo simulado del proveedor')),
    };
    const actions = buildActions(failingRepository);

    render(<CampusOpsScreen actions={actions} />);

    await waitFor(() =>
      expect(
        screen.getByText('Ocurrió un problema al cargar la información. Intenta de nuevo.'),
      ).toBeTruthy(),
    );
  });
});