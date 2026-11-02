import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { IncidentCreateForm } from '../src/ui/IncidentCreateForm';
import type { LocationSearch } from '../src/application/createLocationService';
test('manual entry remains usable while provider is pending; late response cannot overwrite it', async () => {
  let finish!: (value: Awaited<ReturnType<LocationSearch>>) => void;
  const search: LocationSearch = () => new Promise(resolve => { finish = resolve; });
  const create = jest.fn(async () => ({} as never));
  const ui = await render(<IncidentCreateForm createIncident={create} searchLocation={search} />);
  await fireEvent.changeText(ui.getByTestId('location-query'), 'Zona ficticia');
  await fireEvent.press(ui.getByTestId('location-search'));
  await fireEvent.changeText(ui.getByTestId('incident-form-location'), 'Edificio manual');
  await act(async () => finish({ location: { source: 'provider', label: 'Respuesta tardía', latitude: 0, longitude: 0 }, cacheHit: false }));
  expect(ui.getByTestId('incident-form-location')).toHaveProp('value', 'Edificio manual');
  await fireEvent.press(ui.getByTestId('incident-form-submit'));
  await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ location: 'Edificio manual' }), expect.any(String)));
}, 15000);
test('provider unavailable retains manual text; empty manual location cannot be sent', async () => {
  const create = jest.fn(async () => ({} as never));
  const search: LocationSearch = async (_, manual) => ({ location: { source: 'manual', label: manual }, cacheHit: false });
  const ui = await render(<IncidentCreateForm createIncident={create} searchLocation={search} />);
  await fireEvent.press(ui.getByTestId('incident-form-submit'));
  expect(create).not.toHaveBeenCalled();
  await fireEvent.changeText(ui.getByTestId('incident-form-location'), 'Zona manual');
  await fireEvent.changeText(ui.getByTestId('location-query'), 'Consulta sintética');
  await fireEvent.press(ui.getByTestId('location-search'));
  await waitFor(() => expect(ui.getByTestId('location-status')).toHaveTextContent(/Proveedor no disponible/));
  await fireEvent.press(ui.getByTestId('incident-form-submit'));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
});
test('uncertain creation replay retains key and body and prevents double submit', async () => {
  const create = jest.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({});
  const ui = await render(<IncidentCreateForm createIncident={create} />);
  await fireEvent.changeText(ui.getByTestId('incident-form-location'), 'Zona manual');
  await fireEvent.press(ui.getByTestId('incident-form-submit'));
  await waitFor(() => expect(ui.getByTestId('incident-form-status')).toHaveTextContent(/Ocurrio un problema/));
  await fireEvent.press(ui.getByTestId('incident-form-submit'));
  await waitFor(() => expect(ui.getByTestId('incident-form-status')).toHaveTextContent(/Incidencia creada/));
  expect(create.mock.calls[0]).toEqual(create.mock.calls[1]);
});
