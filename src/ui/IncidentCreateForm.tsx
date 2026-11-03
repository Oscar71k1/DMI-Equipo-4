import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CampusOpsActions } from '../application/CampusOpsActions';
import type { LocationProvider } from '../domain/LocationProvider';
import { selectIncidentLocation } from '../domain/selectIncidentLocation';

type CreateIncident = NonNullable<CampusOpsActions['createIncident']>;

type FormState =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error' };

type LookupState =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'found' }
  | { kind: 'unavailable'; waitMs?: number };

type Props = Readonly<{
  createIncident: CreateIncident;
  locationProvider?: LocationProvider;
}>;

const DEFAULT_COOLDOWN_MS = 1000;

export function IncidentCreateForm({ createIncident, locationProvider }: Props) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' });

  // Cada edicion manual o envio invalida las busquedas en curso.
  const lookupToken = useRef(0);
  const blockedUntil = useRef(0);

  const handleLocationChange = (text: string) => {
    lookupToken.current += 1;
    setLocation(text);
    if (state.kind === 'invalid') setState({ kind: 'idle' });
    setLookup((current) => (current.kind === 'searching' ? { kind: 'idle' } : current));
  };

  const handleSearch = () => {
    if (!locationProvider) return;
    const query = location.trim();
    if (query === '' || Date.now() < blockedUntil.current) return;

    lookupToken.current += 1;
    const token = lookupToken.current;
    const manualLabel = location;
    setLookup({ kind: 'searching' });

    locationProvider
      .lookup(query)
      .catch(() => ({ kind: 'unavailable', reason: 'network' }) as const)
      .then((result) => {
        if (token !== lookupToken.current) return; // respuesta tardia: se ignora

        if (result.kind === 'unavailable') {
          if (result.reason === 'rate_limited') {
            const waitMs = result.retryAfterMs ?? DEFAULT_COOLDOWN_MS;
            blockedUntil.current = Date.now() + waitMs;
            setLookup({ kind: 'unavailable', waitMs });
          } else {
            setLookup({ kind: 'unavailable' });
          }
          return;
        }

        const chosen = selectIncidentLocation(result.candidate, manualLabel);
        if (chosen.source === 'provider') {
          setLocation(chosen.label); // el backend solo recibe la etiqueta textual
          setLookup({ kind: 'found' });
        } else {
          setLookup({ kind: 'unavailable' });
        }
      });
  };

  const handleSubmit = () => {
    const finalLocation = location.trim();
    if (finalLocation === '') {
      setState({ kind: 'invalid' });
      return;
    }

    lookupToken.current += 1; // ninguna busqueda pendiente cambia lo enviado
    setLookup((current) => (current.kind === 'searching' ? { kind: 'idle' } : current));
    setState({ kind: 'submitting' });

    const idempotencyKey = `ui-create-${Date.now()}`;

    createIncident(
      { category, description, location: finalLocation },
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
        placeholder="Ubicacion (edificio, zona o referencia)"
        value={location}
        onChangeText={handleLocationChange}
      />

            {locationProvider && (
        <Button
          testID="incident-form-location-search"
          title="Buscar ubicacion"
          onPress={handleSearch}
        />
      )}

      {locationProvider && (
        <Text testID="incident-form-location-attribution">
          Busqueda de ubicacion: datos © OpenStreetMap contributors (ODbL). No escribas datos personales.
        </Text>
      )}

      {lookup.kind === 'searching' && (
        <Text testID="incident-form-location-status">Buscando ubicacion...</Text>
      )}
      {lookup.kind === 'found' && (
        <Text testID="incident-form-location-status">Ubicacion encontrada.</Text>
      )}
      {lookup.kind === 'unavailable' && (
        <Text testID="incident-form-location-status">
          No se pudo obtener la ubicacion automatica. Escribe el edificio, zona o referencia.
        </Text>
      )}

      <Button
        testID="incident-form-submit"
        title="Crear incidencia"
        onPress={handleSubmit}
      />

      {state.kind === 'invalid' && (
        <Text testID="incident-form-status">
          Escribe el edificio, zona o referencia de la ubicacion.
        </Text>
      )}

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