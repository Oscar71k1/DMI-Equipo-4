import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CampusOpsActions } from '../application/CampusOpsActions';
import type { LocationSearch } from '../application/createLocationService';
type CreateIncident = NonNullable<CampusOpsActions['createIncident']>;
type Props = Readonly<{ createIncident: CreateIncident; searchLocation?: LocationSearch }>;
export function IncidentCreateForm({ createIncident, searchLocation }: Props) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('Puedes escribir edificio, zona o referencia sin buscar.');
  const [searching, setSearching] = useState(false);
  const revision = useRef(0);
  const live = useRef(true);
  const sending = useRef(false);
  const pending = useRef<{ key: string; body: { category: string; description: string; location: string } } | null>(null);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function lookup() {
    if (!searchLocation || searching) return;
    const version = ++revision.current;
    setSearching(true);
    setLocationMessage('Buscando. Puedes continuar con tu referencia manual.');
    try {
      const result = await searchLocation(query, location);
      if (!live.current || version !== revision.current) return;
      if (result.location.source === 'provider') {
        setLocation(result.location.label);
        setLocationMessage(`Ubicación aproximada de localidad${result.cacheHit ? ' (caché)' : ''}. Completa edificio o zona manualmente.`);
      } else setLocationMessage('Proveedor no disponible o sin coincidencias. Escribe edificio, zona o referencia.');
    } catch {
      if (live.current && version === revision.current) setLocationMessage('No se pudo buscar. Continúa con la ubicación manual.');
    } finally { if (live.current) setSearching(false); }
  }
  async function handleSubmit() {
    if (sending.current || state === 'success') return;
    if (!location.trim()) { setState('invalid-location'); return; }
    revision.current++;
    sending.current = true; setState('submitting');
    // Retain the exact intent on uncertain responses. Editing requires an explicit new intent after confirmation.
    if (!pending.current) pending.current = { key: `ui-create-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      body: { category, description, location } };
    try {
      await createIncident(pending.current.body, pending.current.key);
      if (live.current) setState('success');
    } catch { if (live.current) setState('error'); }
    finally { sending.current = false; }
  }
  return <View style={styles.form}>
    <TextInput testID="incident-form-category" placeholder="Categoria" value={category} onChangeText={setCategory} editable={state === 'idle' || state === 'invalid-location'} />
    <TextInput testID="incident-form-description" placeholder="Descripcion" value={description} onChangeText={setDescription} editable={state === 'idle' || state === 'invalid-location'} />
    {searchLocation && <View>
      <Text>Buscar localidad aproximada (no ubica edificios del campus)</Text>
      <TextInput testID="location-query" placeholder="Localidad de referencia" value={query}
        onChangeText={value => { revision.current++; setQuery(value); }} editable={state === 'idle' || state === 'invalid-location'} />
      <Button testID="location-search" title="Buscar ubicación" onPress={() => void lookup()}
        disabled={searching || query.trim().length < 2 || !(state === 'idle' || state === 'invalid-location')} />
      <Text>Geocodificación: Open-Meteo · GeoNames · CC BY 4.0</Text>
    </View>}
    <TextInput testID="incident-form-location" placeholder="Edificio, zona o referencia manual" value={location}
      editable={state === 'idle' || state === 'invalid-location'} onChangeText={value => { revision.current++; setLocation(value); setLocationMessage('Ubicación manual seleccionada.'); }} />
    <Text testID="location-status">{locationMessage}</Text>
    <Button testID="incident-form-submit" title={state === 'error' ? 'Reintentar la misma incidencia' : 'Crear incidencia'}
      onPress={() => void handleSubmit()} disabled={state === 'submitting' || state === 'success'} />
    {state === 'invalid-location' && <Text testID="incident-form-status">Escribe una ubicación manual para continuar.</Text>}
    {state === 'submitting' && <Text testID="incident-form-status">Enviando...</Text>}
    {state === 'success' && <Text testID="incident-form-status">Incidencia creada.</Text>}
    {state === 'error' && <View><Text testID="incident-form-status">Ocurrio un problema al cargar la informacion. Intenta de nuevo.</Text><Text>El reintento conserva la misma operación y contenido.</Text></View>}
  </View>;
}
const styles = StyleSheet.create({ form: { gap: 8 } });
