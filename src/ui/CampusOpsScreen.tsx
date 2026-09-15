import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CampusOpsActions } from '../application/CampusOpsActions';
import { IncidentDetailScreen } from './IncidentDetailScreen';
import { IncidentListScreen } from './IncidentListScreen';

type BackendStatus = 'checking' | 'available' | 'offline';

type Props = Readonly<{
  actions: CampusOpsActions;
}>;

export function CampusOpsScreen({ actions }: Props) {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      </View>
      {selectedId === null ? (
        <IncidentListScreen listIncidents={actions.listIncidents} onSelect={setSelectedId} />
      ) : (
        <IncidentDetailScreen
          incidentId={selectedId}
          getIncidentDetail={actions.getIncidentDetail}
          onBack={() => setSelectedId(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16 },
  card: { gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
});