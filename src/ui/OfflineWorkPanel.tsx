import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { OfflineActions } from '../application/createOfflineIncidentActions';
import type { IncidentQueueRecord, QueueSyncRecord } from '../domain/IncidentQueueRecord';

export function OfflineWorkPanel({ actions, incidentId }: {
  actions: OfflineActions; incidentId: string | null;
}) {
  const [pending, setPending] = useState<readonly IncidentQueueRecord[]>([]);
  const [cached, setCached] = useState<readonly QueueSyncRecord[]>([]);
  const [cachedSelection, setCachedSelection] = useState<string | null>(null);
  const selected = incidentId ?? cachedSelection;
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    actions.listPending().then(value => { if (live.current) setPending(value); })
      .catch(() => { if (live.current) setMessage('No se pudo abrir la cola local. Intenta de nuevo.'); });
    actions.listCached().then(value => { if (live.current) setCached(value); }).catch(() => undefined);
    return () => { live.current = false; };
  }, [actions]);
  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      const value = await actions.listPending();
      const snapshots = await actions.listCached();
      if (live.current) { setPending(value); setCached(snapshots); setMessage(success); }
    } catch {
      if (live.current) setMessage('No se pudo completar la acción. Tu trabajo guardado se conserva; revisa sesión, permisos y copia local.');
    } finally { if (live.current) setBusy(false); }
  }
  return <View testID="offline-work-panel" style={{ gap: 8 }}>
    <Text>Trabajo sin conexión</Text>
    {!incidentId && cached.map(snapshot => <Pressable key={snapshot.id} accessibilityRole="button"
      onPress={() => setCachedSelection(snapshot.id)}>
      <Text>Copia local: {snapshot.id}</Text>
      <Text>{String(snapshot.fields.description ?? '')}</Text>
    </Pressable>)}
    {selected && <>
      <Text>Incidencia local: {selected}</Text>
      <Pressable disabled={busy} accessibilityRole="button" onPress={() => void run(
        () => actions.cacheIncident(selected), 'Copia local guardada para trabajar sin conexión.')}>
        <Text>Guardar copia local</Text>
      </Pressable>
      <Pressable disabled={busy} accessibilityRole="button" onPress={() => void run(
        () => actions.queueAction(selected, 'start', {}), 'Inicio guardado en este dispositivo; pendiente de sincronizar.')}>
        <Text>Iniciar atención sin conexión</Text>
      </Pressable>
      <TextInput accessibilityLabel="Nota pendiente" value={text} onChangeText={setText} />
      <Pressable disabled={busy || !text.trim()} accessibilityRole="button" onPress={() => void run(
        () => actions.queueAction(selected, 'comment', { text }), 'Nota guardada en este dispositivo; pendiente de sincronizar.')}>
        <Text>Guardar nota pendiente</Text>
      </Pressable>
    </>}
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void run(
      () => actions.syncPending(), 'Intento de sincronización terminado. Revisa los pendientes y conflictos.')}>
      <Text>Sincronizar pendientes</Text>
    </Pressable>
    {busy && <Text>Procesando…</Text>}
    <Text accessibilityLiveRegion="polite">{message}</Text>
    {pending.map(record => <View key={record.operation.operationId}>
      <Text>{record.operation.incidentId}: {record.operation.action} — {record.status}</Text>
      {record.operation.action === 'comment' && <Text>{String(record.operation.payload.text)}</Text>}
      {record.issue?.kind === 'dependency' && <Text>Espera la confirmación de la acción anterior.</Text>}
      {(record.status === 'conflicto' || record.status === 'bloqueada') &&
        <Text>Tu intención sigue guardada. Requiere revisión con coordinación; no se sobrescribió la asignación.</Text>}
    </View>)}
  </View>;
}
