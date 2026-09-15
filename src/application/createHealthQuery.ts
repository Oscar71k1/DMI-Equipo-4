import type { BackendHealthPort } from '../domain/BackendHealthPort';

export type BackendHealthStatus = 'checking' | 'available' | 'offline';

export type HealthQuery = Readonly<{
  checkHealth: () => Promise<BackendHealthStatus>;
}>;

export function createHealthQuery(port: BackendHealthPort): HealthQuery {
  return {
    checkHealth: () =>
      port
        .check()
        .then((): BackendHealthStatus => 'available')
        .catch((): BackendHealthStatus => 'offline'),
  };
}