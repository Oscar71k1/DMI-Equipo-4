import { createRetryExecutor, type RetryExecutionMetric, type RetryExecutorOptions } from '../application/retryExecutor';
import { parseRetryAfter } from '../application/retryPolicy';
import type { LocationSearchPort } from '../domain/IncidentLocation';
export function createGeocodingAdapter(options: {
  fetchImpl?: typeof fetch; endpoint?: string; format?: 'open-meteo' | 'course';
  headers?: Record<string, string>; retry?: RetryExecutorOptions;
  onMetrics?: (metrics: readonly RetryExecutionMetric[]) => void;
} = {}): LocationSearchPort {
  const endpoint = options.endpoint ?? 'https://geocoding-api.open-meteo.com/v1/search';
  const fetcher = options.fetchImpl ?? fetch;
  const executor = createRetryExecutor(options.retry);
  return { async search(query) {
    const course = options.format === 'course';
    const url = `${endpoint}?${course ? 'q' : 'name'}=${encodeURIComponent(query)}${course ? '' : '&count=1&language=es&format=json'}`;
    const response = await executor.execute({ method: 'GET', operation: async signal => {
      const http = await fetcher(url, { signal, ...(course && options.headers ? { headers: options.headers } : {}) });
      if (!http.ok) throw { status: http.status, retryAfterMs: parseRetryAfter(http.headers.get('retry-after')) };
      const data: unknown = await http.json();
      if (course) return data;
      const result = data && typeof data === 'object' && 'results' in data && Array.isArray(data.results) ? data.results[0] : null;
      if (!result || typeof result !== 'object') return null;
      return { label: result.name, latitude: result.latitude, longitude: result.longitude };
    } });
    options.onMetrics?.(response.metrics);
    return response.result ?? null;
  } };
}
