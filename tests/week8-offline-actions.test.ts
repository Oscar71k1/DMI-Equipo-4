import { createOfflineIncidentActions } from '../src/application/createOfflineIncidentActions';
import { SQLiteIncidentStore } from '../src/infrastructure/SQLiteIncidentStore';
import { migrateIncidentStore } from '../src/infrastructure/incidentMigrations';
import { base, openDb } from './helpers/week8';
import type { Actor } from '../src/domain/Actor';

test('application queues ordered offline work and isolates cached data by actor', async () => {
  const db = openDb(':memory:');
  try {
    await migrateIncidentStore(db);
    const store = new SQLiteIncidentStore(db);
    let actor: Actor = { id: 'technician-1', role: 'technician' };
    let serial = 0;
    const actions = createOfflineIncidentActions({
      store, getActor: () => actor, getSessionKey: () => actor.id,
      newId: () => `offline-operation-${++serial}`,
      client: { getIncidentSnapshot: async () => base,
        performIncidentAction: async () => { throw new Error('offline'); } },
    });
    await expect(actions.queueAction(base.id, 'start', {})).rejects.toThrow('Primero guarda');
    await actions.cacheIncident(base.id);
    const [start, note] = await Promise.all([
      actions.queueAction(base.id, 'start', {}),
      actions.queueAction(base.id, 'comment', { text: 'Nota que debe sobrevivir' }),
    ]);
    const pending = await actions.listPending();
    expect(pending.map(r => r.operation.operationId)).toEqual([start, note]);
    expect(pending[1]).toEqual(expect.objectContaining({
      dependsOn: [start], operation: expect.objectContaining({ payload: { text: 'Nota que debe sobrevivir' } }),
    }));
    await expect(actions.queueAction(base.id, 'start', {})).rejects.toThrow('Ya hay un inicio');
    actor = { id: 'technician-2', role: 'technician' };
    expect(await actions.listCached()).toEqual([]);
    expect(await actions.listPending()).toEqual([]);
    await store.saveConfirmed(actor.id, base);
    await expect(actions.queueAction(base.id, 'start', {})).rejects.toThrow('Acción no autorizada');
  } finally { db.close(); }
});

test('logout during cache download never persists the previous session response', async () => {
  const db = openDb(':memory:');
  try {
    await migrateIncidentStore(db);
    const store = new SQLiteIncidentStore(db);
    let generation = 1;
    let finish!: (value: typeof base) => void;
    const actions = createOfflineIncidentActions({
      store, getActor: () => ({ id: 'technician-1', role: 'technician' }),
      getSessionKey: () => generation, newId: () => 'unused-operation',
      client: { getIncidentSnapshot: () => new Promise(resolve => { finish = resolve; }),
        performIncidentAction: async () => { throw new Error('unused'); } },
    });
    const caching = actions.cacheIncident(base.id);
    generation++;
    finish(base);
    await expect(caching).rejects.toThrow('Session changed');
    expect(await store.listConfirmed('technician-1')).toEqual([]);
  } finally { db.close(); }
});
