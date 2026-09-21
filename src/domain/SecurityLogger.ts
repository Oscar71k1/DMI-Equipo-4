export type SecurityLogEntry = Readonly<{
  event: string;
  incidentId: string;
  actorRole: string;
  granted: boolean;
}>;

export interface SecurityLogger {
  log(entry: SecurityLogEntry): void;
}