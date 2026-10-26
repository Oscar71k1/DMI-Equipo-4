import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OfflineWorkPanel } from '../src/ui/OfflineWorkPanel';
import type { OfflineActions } from '../src/application/createOfflineIncidentActions';
import { base, record } from './helpers/week8';

function actions(): OfflineActions {
  return {
    cacheIncident: jest.fn().mockResolvedValue(undefined),
    queueAction: jest.fn().mockResolvedValue('operation-id'),
    listPending: jest.fn().mockResolvedValue([record('note-operation-001', 'comment')]),
    listCached: jest.fn().mockResolvedValue([base]),
    syncPending: jest.fn().mockResolvedValue({ processed: 0, issues: 1 }),
  };
}
test('recovered cached incident and note are usable without a remote detail screen', async () => {
  const api = actions();
  const view = await render(<OfflineWorkPanel actions={api} incidentId={null} />);
  await waitFor(() => expect(view.getByText('Nota ficticia')).toBeTruthy());
  await fireEvent.press(view.getByText('Copia local: campus-inc-001'));
  await fireEvent.changeText(view.getByLabelText('Nota pendiente'), 'Otra nota');
  await fireEvent.press(view.getByText('Guardar nota pendiente'));
  await waitFor(() => expect(api.queueAction).toHaveBeenCalledWith(base.id, 'comment', { text: 'Otra nota' }));
  await waitFor(() => expect(view.getByText('Nota guardada en este dispositivo; pendiente de sincronizar.')).toBeTruthy());
  await view.unmount();
}, 30000);
test('failed local save never reports success or discards the entered note', async () => {
  const api = actions();
  jest.mocked(api.queueAction).mockRejectedValue(new Error('disk full'));
  const view = await render(<OfflineWorkPanel actions={api} incidentId={base.id} />);
  await waitFor(() => expect(view.getByText('Nota ficticia')).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText('Nota pendiente'), 'Conservar texto');
  await fireEvent.press(view.getByText('Guardar nota pendiente'));
  await waitFor(() => expect(view.getByText(/No se pudo completar/)).toBeTruthy());
  expect(view.queryByText('Nota guardada en este dispositivo; pendiente de sincronizar.')).toBeNull();
  expect(view.getByLabelText('Nota pendiente').props.value).toBe('Conservar texto');
  await view.unmount();
});
