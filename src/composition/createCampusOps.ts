import type { CampusOpsActions } from '../application/CampusOpsActions';
import { createAuthorizedIncidentQueries } from '../application/createAuthorizedIncidentQueries';
import { createHealthQuery } from '../application/createHealthQuery';
import { createSessionStore } from '../application/createSessionStore';
import { createSessionCoordinator } from '../application/createSessionCoordinator';
import { createAuthorizedIncidentAction } from '../application/createAuthorizedIncidentAction';
import { canCreateIncident } from '../domain/incidentAuthorization';
import { createExpoSecureTokenStorage } from '../infrastructure/ExpoSecureTokenStorage';
import type { Actor } from '../domain/Actor';
import { createCourseBackendHealthAdapter } from '../infrastructure/CourseBackendHealthAdapter';
import { createRemoteIncidentRepository } from '../infrastructure/RemoteIncidentRepository';
import { createInMemorySecurityLogger } from '../infrastructure/InMemorySecurityLogger';
import { createCourseSessionAdapter } from '../infrastructure/CourseSessionAdapter';
import { IncidentClientError, createIncidentClient } from '../api/incidentClient';
import { createOfflineIncidentActions, type OfflineActions } from '../application/createOfflineIncidentActions';
import { SQLiteIncidentStore } from '../infrastructure/SQLiteIncidentStore';
import { createExpoSqliteAdapter } from '../infrastructure/ExpoSqliteAdapter';
import { migrateIncidentStore } from '../infrastructure/incidentMigrations';

export function createCampusOps(): CampusOpsActions {
  const logger = createInMemorySecurityLogger();
  const session = createSessionStore({
    secureStorage: createExpoSecureTokenStorage(),
    log: () => logger.log({ event: 'session-storage-error', incidentId: '', actorRole: 'demo', granted: false }),
  });
  const sessionAdapter = createCourseSessionAdapter();
  const auth = createSessionCoordinator({
    refreshPort: sessionAdapter,
    loginPort: sessionAdapter,
    store: session,
    clock: { now: Date.now },
    log: (entry) => logger.log({
      event: String(entry.event ?? 'session-event'),
      incidentId: '',
      actorRole: 'session',
      granted: false,
    }),
  });
  const incidentRepository = createRemoteIncidentRepository({ session: auth });
  const healthPort = createCourseBackendHealthAdapter();

  const incidentQueries = createAuthorizedIncidentQueries(
    incidentRepository, logger,
  );
  const authorizedAction = createAuthorizedIncidentAction(incidentRepository, logger);
  const currentActor = (): Actor => {
    const identity = auth.snapshot().identity;
    if (!identity) throw new IncidentClientError('http', 401);
    return { id: identity.actorId, role: identity.role };
  };
  const healthQuery = createHealthQuery(healthPort);
  let offlinePromise: Promise<OfflineActions> | null = null;
  const offline = (): Promise<OfflineActions> => {
    if (!offlinePromise) {
      offlinePromise = (async () => {
        const { openDatabaseAsync } = await import('expo-sqlite');
        const db = createExpoSqliteAdapter(await openDatabaseAsync('campusops.sqlite'));
        await migrateIncidentStore(db);
        const store = new SQLiteIncidentStore(db);
        await store.recoverInterrupted();
        const client = createIncidentClient({ session: auth });
        return createOfflineIncidentActions({
          store, getActor: currentActor, getSessionKey: () => auth.snapshot().generation,
          newId: () => `campus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
          client: {
            getIncidentSnapshot: client.getIncidentSnapshot,
            async performIncidentAction(id, body, key) {
              const result = await client.performIncidentAction(id, body, key);
              if (!result.snapshot) throw new IncidentClientError('unavailable');
              return { operationId: result.operationId, duplicate: result.duplicate, incident: result.snapshot };
            },
          },
        });
      })().catch(error => { offlinePromise = null; throw error; });
    }
    return offlinePromise;
  };

  async function withOffline<T>(run: (actions: OfflineActions) => Promise<T>): Promise<T> {
    const actor = currentActor().id;
    const generation = auth.snapshot().generation;
    const actions = await offline();
    if (currentActor().id !== actor || auth.snapshot().generation !== generation) throw new IncidentClientError('http', 401);
    return run(actions);
  }

  return {
    offline: {
      cacheIncident: id => withOffline(actions => actions.cacheIncident(id)),
      queueAction: (id, action, payload) => withOffline(actions => actions.queueAction(id, action, payload)),
      listPending: () => withOffline(actions => actions.listPending()),
      listCached: () => withOffline(actions => actions.listCached()),
      syncPending: () => withOffline(actions => actions.syncPending()),
      acceptRemote: id => withOffline(actions => actions.acceptRemote(id)),
    },
    session,
    auth,
    listIncidents: () => incidentQueries.listIncidents(currentActor()),
    getIncidentDetail: (id) => incidentQueries.getIncidentDetail(currentActor(), id),
    createIncident: async (input, idempotencyKey) => {
      const actor = currentActor();
      if (!canCreateIncident(actor)) throw new IncidentClientError('http', 403);
      if (!incidentRepository.create) throw new Error('Incident creation is unavailable');
      return incidentRepository.create(input, idempotencyKey);
    },
    performIncidentAction: (incidentId, input, idempotencyKey) =>
      authorizedAction(currentActor(), incidentId, input, idempotencyKey),
    checkHealth: healthQuery.checkHealth,
  };
}
