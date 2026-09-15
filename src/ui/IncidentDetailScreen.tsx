import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Incident } from '../domain/Incident';
import { incidentCategoryLabels, incidentStatusLabels } from './incidentLabels';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'not-found' }
  | { kind: 'loaded'; incident: Incident };

type Props = Readonly<{
  incidentId: string;
  getIncidentDetail: (id: string) => Promise<Incident | null>;
  onBack: () => void;
}>;

export function IncidentDetailScreen({ incidentId, getIncidentDetail, onBack }: Props) {
  const [result, setResult] = useState<{
    incidentId: string;
    query: Props['getIncidentDetail'];
    state: DetailState;
  } | null>(null);
  const state: DetailState =
    result?.incidentId === incidentId && result.query === getIncidentDetail
      ? result.state
      : { kind: 'loading' };

  useEffect(() => {
    let active = true;
    getIncidentDetail(incidentId)
      .then((incident) => {
        if (!active) return;
        setResult({
          incidentId,
          query: getIncidentDetail,
          state: incident === null ? { kind: 'not-found' } : { kind: 'loaded', incident },
        });
      })
      .catch(() => {
        if (active) setResult({ incidentId, query: getIncidentDetail, state: { kind: 'error' } });
      });
    return () => {
      active = false;
    };
  }, [incidentId, getIncidentDetail]);

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" testID="incident-detail-back" onPress={onBack}>
        <Text>← Volver a la lista</Text>
      </Pressable>
      {state.kind === 'loading' && <Text testID="incident-detail-status">Cargando incidencia…</Text>}
      {state.kind === 'error' && (
        <Text testID="incident-detail-status">
          Ocurrió un problema al cargar la información. Intenta de nuevo.
        </Text>
      )}
      {state.kind === 'not-found' && (
        <Text testID="incident-detail-status">No se encontró la incidencia solicitada.</Text>
      )}
      {state.kind === 'loaded' && (
        <View testID="incident-detail-content">
          <Text style={styles.title}>{incidentCategoryLabels[state.incident.category]}</Text>
          <Text>{state.incident.description}</Text>
          <Text>{state.incident.location.label}</Text>
          <Text>Estado: {incidentStatusLabels[state.incident.status]}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
});
