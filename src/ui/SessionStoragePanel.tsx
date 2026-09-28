import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import type { SessionStore } from '../application/createSessionStore';

/** Week 4 storage demonstration; this does not authenticate the demo actor. */
export function SessionStoragePanel({ session }: { session: SessionStore }) {
  const [status, setStatus] = useState('Comprobando sesión de prueba');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    session.restoreToken().then((result) => {
      if (!active) return;
      setStatus(result.kind === 'storage-error' ? 'No se pudo recuperar la sesión' :
        result.token ? 'Sesión de prueba recuperada' : 'Sin sesión de prueba guardada');
      setBusy(false);
    });
    return () => { active = false; };
  }, [session]);

  async function update(clear: boolean) {
    setBusy(true);
    const result = clear ? await session.clearToken() : await session.persistToken('campusops-synthetic-session-week04');
    setStatus(result.kind === 'storage-error'
      ? (clear ? 'No se pudo eliminar la sesión; vuelve a intentarlo' : 'No se pudo guardar la sesión')
      : (clear ? 'Sesión de prueba eliminada' : 'Sesión de prueba guardada'));
    setBusy(false);
  }

  return (
    <View>
      <Text>Sesión ficticia para comprobar almacenamiento; no inicia sesión.</Text>
      <Text testID="session-storage-status">{status}</Text>
      <Button title="Guardar sesión de prueba" disabled={busy} onPress={() => update(false)} />
      <Button title="Eliminar sesión de prueba" disabled={busy} onPress={() => update(true)} />
    </View>
  );
}
