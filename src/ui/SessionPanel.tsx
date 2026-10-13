import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SessionCoordinator } from '../application/createSessionCoordinator';

const FIXTURE_ACTORS = [
  { id: 'reporter-1', label: 'Reportante' },
  { id: 'technician-1', label: 'Técnico' },
  { id: 'coordinator-1', label: 'Coordinación' },
] as const;

export function SessionPanel({ auth }: { auth: SessionCoordinator }) {
  const [snapshot, setSnapshot] = useState(auth.snapshot());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => auth.subscribe(setSnapshot), [auth]);

  async function signIn(actorId: string) {
    setBusy(true);
    setMessage('');
    const result = await auth.signIn(actorId);
    if (result !== 'ok') {
      setMessage(result === 'storage-error'
        ? 'No se pudo guardar la sesión en almacenamiento seguro.'
        : result === 'rejected' ? 'El actor de prueba fue rechazado.' : 'No se pudo iniciar sesión con el backend.');
    }
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    const result = await auth.logout();
    setMessage(result === 'ok' ? 'Sesión cerrada.' : 'Sesión cerrada en la app, pero no se pudo confirmar el borrado seguro. Intenta cerrar sesión otra vez.');
    setBusy(false);
  }

  if (snapshot.status === 'restoring' || snapshot.status === 'expired' || snapshot.status === 'refreshing') {
    const label = snapshot.status === 'restoring' ? 'Recuperando sesión segura…' : 'Renovando sesión segura…';
    return <Text testID="session-status">{label}</Text>;
  }

  if (snapshot.status === 'authenticated' && snapshot.identity) {
    return (
      <View style={styles.panel}>
        <Text testID="session-status">Sesión activa · {snapshot.identity.role}</Text>
        <Text>{snapshot.identity.actorId}</Text>
        <Pressable accessibilityRole="button" testID="session-logout" disabled={busy} onPress={() => { void signOut(); }}>
          <Text>{busy ? 'Cerrando…' : 'Cerrar sesión'}</Text>
        </Pressable>
        {message !== '' && <Text accessibilityLiveRegion="polite">{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text testID="session-status">Sin sesión autenticada</Text>
      <Text>Actores ficticios del backend didáctico; este selector no es autenticación de producción.</Text>
      {FIXTURE_ACTORS.map((actor) => (
        <Pressable
          accessibilityRole="button"
          key={actor.id}
          testID={`session-login-${actor.id}`}
          disabled={busy}
          onPress={() => { void signIn(actor.id); }}
        >
          <Text>{busy ? 'Conectando…' : `Entrar como ${actor.label}`}</Text>
        </Pressable>
      ))}
      {message !== '' && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({ panel: { gap: 8 }, });
