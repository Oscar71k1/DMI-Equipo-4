import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { createCampusOps } from '../src/composition/createCampusOps';
import { createSessionStore } from '../src/application/createSessionStore';
import { redactForTelemetry } from '../src/domain/redactForTelemetry';
import { SessionStoragePanel } from '../src/ui/SessionStoragePanel';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

beforeEach(() => jest.resetAllMocks());

test('R-05: UI consumes composition and native adapter, restores after remount and deletes', async () => {
  let stored: string | null = null;
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (_key, value) => { stored = value; });
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async () => stored);
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async () => { stored = null; });
  const session = createCampusOps().session!;
  const first = await render(<SessionStoragePanel session={session} />);
  await waitFor(() => expect(first.getByText('Sin sesión de prueba guardada')).toBeTruthy());
  await fireEvent.press(first.getByText('Guardar sesión de prueba'));
  await waitFor(() => expect(first.getByText('Sesión de prueba guardada')).toBeTruthy());
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('campusops.session.token', expect.any(String), { keychainAccessible: 'device-only' });
  expect(JSON.stringify(first.toJSON())).not.toContain(stored);
  await first.unmount();
  const second = await render(<SessionStoragePanel session={createCampusOps().session!} />);
  await waitFor(() => expect(second.getByText('Sesión de prueba recuperada')).toBeTruthy());
  await fireEvent.press(second.getByText('Eliminar sesión de prueba'));
  await waitFor(() => expect(second.getByText('Sesión de prueba eliminada')).toBeTruthy());
  expect(stored).toBeNull();
  // First render can include cold React Native transforms on Windows.
}, 30000);

test('R-05: native delete failure is visible and never claims deletion', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('synthetic-private-value');
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValue(new Error('synthetic-private-value'));
  const view = await render(<SessionStoragePanel session={createCampusOps().session!} />);
  await waitFor(() => expect(view.getByText('Sesión de prueba recuperada')).toBeTruthy());
  await fireEvent.press(view.getByText('Eliminar sesión de prueba'));
  await waitFor(() => expect(view.getByText('No se pudo eliminar la sesión; vuelve a intentarlo')).toBeTruthy());
  expect(JSON.stringify(view.toJSON())).not.toContain('synthetic-private-value');
});

test('R-05: pending save completes before deletion, logger failure cannot expose native error', async () => {
  let finish!: () => void;
  let stored: string | null = null;
  const session = createSessionStore({
    secureStorage: {
      save: async (token) => { await new Promise<void>((resolve) => { finish = resolve; }); stored = token; },
      read: async () => { throw new Error('synthetic-private-value'); },
      clear: async () => { stored = null; },
    },
    log: () => { throw new Error('logger unavailable'); },
  });
  const save = session.persistToken('synthetic-private-value');
  const clear = session.clearToken();
  await Promise.resolve();
  finish();
  await expect(save).resolves.toEqual({ kind: 'ok' });
  await expect(clear).resolves.toEqual({ kind: 'ok' });
  expect(stored).toBeNull();
  await expect(session.restoreToken()).resolves.toEqual({ kind: 'storage-error' });
});

test('R-03: covers every contracted field, cycles, errors and prototype keys without mutation', () => {
  const keys = ['authorization', 'password', 'token', 'accessToken', 'refreshToken', 'email', 'displayName', 'name', 'userId', 'reporterId', 'technicianId', 'assignedTechnicianId', 'location', 'latitude', 'longitude', 'photos', 'evidence', 'internalComments', 'assignmentHistory'];
  const input = Object.freeze(Object.fromEntries(keys.map((key) => [key, 'private-fixture'])));
  expect(redactForTelemetry([input])).toEqual([Object.fromEntries(keys.map((key) => [key, '[REDACTED]']))]);
  const cycle: Record<string, unknown> = { incidentId: 'inc-1', message: 'private-fixture', error: new Error('private-fixture') };
  cycle.self = cycle;
  expect(redactForTelemetry(cycle)).toEqual({ incidentId: 'inc-1', message: '[REDACTED]', error: '[REDACTED]', self: '[CIRCULAR]' });
  const result = redactForTelemetry(JSON.parse('{"__proto__":{"token":"private-fixture"}}'));
  expect(JSON.stringify(result)).toContain('[REDACTED]');
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
});
