import type { BackendHealthPort } from '../domain/BackendHealthPort';
import { getBackendHealth } from '../api/courseBackend';

export function createCourseBackendHealthAdapter(): BackendHealthPort {
  return {
    check: () => getBackendHealth().then(() => undefined),
  };
}