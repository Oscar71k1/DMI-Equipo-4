import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import type { Incident } from '../domain/Incident';

type ListState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'loaded'; incidents: readonly Incident[] };

type Props = Readonly<{
  listIncidents: () => Promise<readonly Incident[]>;
  onSelect: (id: string) => void;
}>;

export function IncidentListScreen({ listIncidents, onSelect }: Props) {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    listIncidents()
      .then((incidents) => {
        if (!active) return;
        setState(incidents.length === 0 ? { kind: 'empty' } : { kind: 'loaded', incidents });
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [listIncidents]);

  if (state.kind === 'loading') {
    return <Text testID="incident-list-status">Cargando incidencias…</Text>;
  }
  if (state.kind === 'error') {
    return (
      <Text testID="incident-list-status">
        Ocurrió un problema al cargar la información. Intenta de nuevo.
      </Text>
    );
  }
  if (state.kind === 'empty') {
    return <Text testID="incident-list-status">No hay incidencias registradas todavía.</Text>;
  }

  return (
    <FlatList
      testID="incident-list"
      data={state.incidents}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          testID={`incident-item-${item.id}`}
          style={styles.item}
          onPress={() => onSelect(item.id)}
        >
          <Text style={styles.itemTitle}>{item.category}</Text>
          <Text>{item.description}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  itemTitle: { fontWeight: '600' },
});