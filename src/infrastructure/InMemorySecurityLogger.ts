import type { SecurityLogEntry, SecurityLogger } from '../domain/SecurityLogger';

export function createInMemorySecurityLogger(): SecurityLogger & {
  entries: () => readonly SecurityLogEntry[];
} {
  const entries: SecurityLogEntry[] = [];
  return {
    log(entry) {
      const { event, incidentId, actorRole, granted } = entry;
      entries.push({ event, incidentId, actorRole, granted });
    },
    entries: () => entries.map((entry) => ({ ...entry })),
  };
}
