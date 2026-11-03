import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { LocationLookupResult, LocationProvider } from '../src/domain/LocationProvider';
import { IncidentCreateForm } from '../src/ui/IncidentCreateForm';

afterEach(async () => {
  await cleanup();
});

function makeCreateIncident() {
  return jest.fn(async (..._args: unknown[]) => ({}) as never);
}

function makeProvider(result: Promise<LocationLookupResult> | LocationLookupResult) {
  const lookup = jest.fn(() => Promise.resolve(result));
  const provider: LocationProvider = { lookup };
  return { provider, lookup };
}

const FOUND: LocationLookupResult = {
  kind: 'found',
  candidate: { label: 'Edificio A, Campus', latitude: 0, longitude: 0 },
};

async function fillBasics(getByTestId: (id: string) => unknown) {
  await fireEvent.changeText(getByTestId('incident-form-category') as never, 'electrical');
  await fireEvent.changeText(getByTestId('incident-form-description') as never, 'desc ficticia');
}

describe('captura de ubicacion en IncidentCreateForm', () => {
  it('si el proveedor falla, muestra el aviso y conserva el texto escrito', async () => {
    const { provider } = makeProvider({ kind: 'unavailable', reason: 'timeout' });
    const { getByTestId } = await render(
      <IncidentCreateForm createIncident={makeCreateIncident()} locationProvider={provider} />,
    );

    await fireEvent.changeText(getByTestId('incident-form-location'), 'Lab ficticio');
    await fireEvent.press(getByTestId('incident-form-location-search'));

    await waitFor(() => {
      expect(getByTestId('incident-form-location-status')).toHaveTextContent(
        'No se pudo obtener la ubicacion automatica. Escribe el edificio, zona o referencia.',
      );
    });
    expect(getByTestId('incident-form-location').props.value).toBe('Lab ficticio');
  });

  it('tras la falla, la ubicacion manual llega a createIncident sin espacios sobrantes', async () => {
    const { provider } = makeProvider({ kind: 'unavailable', reason: 'network' });
    const createIncident = makeCreateIncident();
    const { getByTestId } = await render(
      <IncidentCreateForm createIncident={createIncident} locationProvider={provider} />,
    );

    await fillBasics(getByTestId);
    await fireEvent.changeText(getByTestId('incident-form-location'), 'Lab ficticio');
    await fireEvent.press(getByTestId('incident-form-location-search'));
    await waitFor(() => {
      expect(getByTestId('incident-form-location-status')).toBeTruthy();
    });

    await fireEvent.changeText(getByTestId('incident-form-location'), '  Edificio B  ');
    await fireEvent.press(getByTestId('incident-form-submit'));

    await waitFor(() => {
      expect(createIncident).toHaveBeenCalledTimes(1);
    });
    expect(createIncident).toHaveBeenCalledWith(
      { category: 'electrical', description: 'desc ficticia', location: 'Edificio B' },
      expect.any(String),
    );
  });

  it('con ubicacion vacia o solo espacios no llama a createIncident', async () => {
    const createIncident = makeCreateIncident();
    const { getByTestId } = await render(<IncidentCreateForm createIncident={createIncident} />);

    await fillBasics(getByTestId);
    await fireEvent.changeText(getByTestId('incident-form-location'), '   ');
    await fireEvent.press(getByTestId('incident-form-submit'));

    await waitFor(() => {
      expect(getByTestId('incident-form-status')).toHaveTextContent(
        'Escribe el edificio, zona o referencia de la ubicacion.',
      );
    });
    expect(createIncident).not.toHaveBeenCalled();
  });

  it('una respuesta tardia no pisa lo que el usuario escribio despues', async () => {
    let resolve!: (r: LocationLookupResult) => void;
    const pending = new Promise<LocationLookupResult>((r) => {
      resolve = r;
    });
    const { provider } = makeProvider(pending);
    const { getByTestId, queryByTestId } = await render(
      <IncidentCreateForm createIncident={makeCreateIncident()} locationProvider={provider} />,
    );

    await fireEvent.changeText(getByTestId('incident-form-location'), 'Lab ficticio');
    await fireEvent.press(getByTestId('incident-form-location-search'));
    await fireEvent.changeText(getByTestId('incident-form-location'), 'Edificio manual');

    await act(async () => {
      resolve(FOUND);
      await pending;
    });

    expect(getByTestId('incident-form-location').props.value).toBe('Edificio manual');
    expect(queryByTestId('incident-form-location-status')).toBeNull();
  });

  it('con 429 no lanza otra consulta inmediata', async () => {
    const { provider, lookup } = makeProvider({
      kind: 'unavailable',
      reason: 'rate_limited',
      retryAfterMs: 1000,
    });
    const { getByTestId } = await render(
      <IncidentCreateForm createIncident={makeCreateIncident()} locationProvider={provider} />,
    );

    await fireEvent.changeText(getByTestId('incident-form-location'), 'Lab ficticio');
    await fireEvent.press(getByTestId('incident-form-location-search'));
    await waitFor(() => {
      expect(getByTestId('incident-form-location-status')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('incident-form-location-search'));
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('si el proveedor responde bien, usa la etiqueta y esa llega a createIncident', async () => {
    const { provider } = makeProvider(FOUND);
    const createIncident = makeCreateIncident();
    const { getByTestId } = await render(
      <IncidentCreateForm createIncident={createIncident} locationProvider={provider} />,
    );

    await fillBasics(getByTestId);
    await fireEvent.changeText(getByTestId('incident-form-location'), 'Edificio A');
    await fireEvent.press(getByTestId('incident-form-location-search'));
    await waitFor(() => {
      expect(getByTestId('incident-form-location').props.value).toBe('Edificio A, Campus');
    });

    await fireEvent.press(getByTestId('incident-form-submit'));
    await waitFor(() => {
      expect(createIncident).toHaveBeenCalledTimes(1);
    });
    expect(createIncident).toHaveBeenCalledWith(
      { category: 'electrical', description: 'desc ficticia', location: 'Edificio A, Campus' },
      expect.any(String),
    );
  });
});