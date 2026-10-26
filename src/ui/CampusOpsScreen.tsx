import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CampusOpsActions } from '../application/CampusOpsActions';
import { IncidentDetailScreen } from './IncidentDetailScreen';
import { IncidentCreateForm } from './IncidentCreateForm';
import { IncidentListScreen } from './IncidentListScreen';
import { SessionStoragePanel } from './SessionStoragePanel';
import { SessionPanel } from './SessionPanel';
import { OfflineWorkPanel } from './OfflineWorkPanel';

type BackendStatus = 'checking' | 'available' | 'offline';

type Props = Readonly<{
  actions: CampusOpsActions;
}>;

export function CampusOpsScreen({ actions }: Props) {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sessionSnapshot, setSessionSnapshot] = useState(actions.auth?.snapshot() ?? null);

  useEffect(() => {
    if (!actions.auth) return undefined;
    const unsubscribe = actions.auth.subscribe(setSessionSnapshot);
    if (actions.auth.snapshot().status === 'restoring') void actions.auth.restore();
    return unsubscribe;
  }, [actions.auth]);

  useEffect(() => {
    let active = true;
    actions.checkHealth().then((status) => {
      if (active) setBackendStatus(status);
    });
    return () => {
      active = false;
    };
  }, [actions]);

  return (
    <View style={styles.screen}>
      <View accessibilityRole="summary" style={styles.card}>
        <Text style={styles.title}>CampusOps</Text>
        <Text>Incidencias del campus · entorno académico ficticio</Text>
        <Text testID="backend-status">Backend: {backendStatus}</Text>
        {actions.auth ? <SessionPanel auth={actions.auth} /> : actions.session && <SessionStoragePanel session={actions.session} />}
      </View>
      {actions.offline && sessionSnapshot?.status === 'authenticated' &&
        <OfflineWorkPanel key={sessionSnapshot.generation} actions={actions.offline} incidentId={selectedId} />}
      {actions.auth && sessionSnapshot?.status !== 'authenticated' ? null : selectedId !== null ? (
        <IncidentDetailScreen
          key={sessionSnapshot?.generation}
          incidentId={selectedId}
          getIncidentDetail={actions.getIncidentDetail}
          onBack={() => setSelectedId(null)}
        />
      ) : creating && actions.createIncident ? (
        <View style={styles.content}>
          <Pressable accessibilityRole="button" testID="incident-create-back" onPress={() => setCreating(false)}>
            <Text>← Volver a la lista</Text>
          </Pressable>
          <IncidentCreateForm key={sessionSnapshot?.generation} createIncident={actions.createIncident} />
        </View>
      ) : (
        <View style={styles.content}>
          {actions.createIncident && (
            <Pressable accessibilityRole="button" testID="incident-create-open" onPress={() => setCreating(true)}>
              <Text>Nueva incidencia</Text>
            </Pressable>
          )}
          <IncidentListScreen key={sessionSnapshot?.generation} listIncidents={actions.listIncidents} onSelect={setSelectedId} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16 },
  card: { gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  content: { flex: 1, gap: 12 },
});
