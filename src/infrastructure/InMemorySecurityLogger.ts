import type { SecurityLogEntry, SecurityLogger } from '../domain/SecurityLogger';

export function createInMemorySecurityLogger(): SecurityLogger & {
  entries: () => readonly SecurityLogEntry[];
} {
  const entries: SecurityLogEntry[] = [];
  return {
    log(entry) {
      entries.push(entry);
    },
    entries: () => entries,
  };
}