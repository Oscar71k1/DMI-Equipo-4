import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CampusOpsActions } from '../application/CampusOpsActions';

type CreateIncident = NonNullable<CampusOpsActions['createIncident']>;

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error' };

type Props = Readonly<{
  createIncident: CreateIncident;
}>;

export function IncidentCreateForm({ createIncident }: Props) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });

  const handleSubmit = () => {
    setState({ kind: 'submitting' });

    const idempotencyKey = `ui-create-${Date.now()}`;

    createIncident(
      { category, description, location },
      idempotencyKey,
    )
      .then(() => {
        setState({ kind: 'success' });
      })
      .catch(() => {
        setState({ kind: 'error' });
      });
  };

  return (
    <View style={styles.form}>
      <TextInput
        testID="incident-form-category"
        placeholder="Categoria"
        value={category}
        onChangeText={setCategory}
      />

      <TextInput
        testID="incident-form-description"
        placeholder="Descripcion"
        value={description}
        onChangeText={setDescription}
      />

      <TextInput
        testID="incident-form-location"
        placeholder="Ubicacion"
        value={location}
        onChangeText={setLocation}
      />

      <Button
        testID="incident-form-submit"
        title="Crear incidencia"
        onPress={handleSubmit}
      />

      {state.kind === 'submitting' && (
        <Text testID="incident-form-status">
          Enviando...
        </Text>
      )}

      {state.kind === 'success' && (
        <Text testID="incident-form-status">
          Incidencia creada.
        </Text>
      )}

      {state.kind === 'error' && (
        <Text testID="incident-form-status">
          Ocurrio un problema al cargar la informacion. Intenta de nuevo.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
});