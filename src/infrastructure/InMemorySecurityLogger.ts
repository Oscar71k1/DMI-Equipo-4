import type { SecurityLogEntry, SecurityLogger } from '../domain/SecurityLogger';
import { redactForTelemetry } from '../domain/redactForTelemetry';

export function createInMemorySecurityLogger(): SecurityLogger & {
  entries: () => readonly SecurityLogEntry[];
} {
  const entries: SecurityLogEntry[] = [];
  return {
    log(entry) {
      const { event, incidentId, actorRole, granted } = entry;
      entries.push(redactForTelemetry({ event, incidentId, actorRole, granted }) as SecurityLogEntry);
    },
    entries: () => entries.map((entry) => ({ ...entry })),
  };
}
