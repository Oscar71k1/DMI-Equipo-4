import { createRetryPolicy, type HttpMethod, type RetryConfig } from './retryPolicy';
export type RetryExecutionMetric = {
  attempt: number; status: number | 'timeout'; plannedDelayMs: number; actualDelayMs: number; durationMs: number;
  stopReason?: 'success' | 'max_attempts' | 'non_transient' | 'missing_idempotency_key' | 'budget';
};
export type RetryExecutorOptions = {
  maxTimeoutMs?: number; policy?: Partial<RetryConfig>; maxElapsedMs?: number;
  sleepFn?: (ms: number) => Promise<void>; nowFn?: () => number;
};
export type ExecuteWithRetryParams<T> = {
  method: HttpMethod; idempotencyKey?: string; operation: (signal: AbortSignal) => Promise<T>;
};
export function createRetryExecutor(options: RetryExecutorOptions = {}) {
  const timeout = options.maxTimeoutMs ?? 5000;
  const budget = options.maxElapsedMs ?? 30000;
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 60000 ||
      !Number.isFinite(budget) || budget <= 0 || budget > 300000) throw new Error('Invalid retry time budget');
  const planRetry = createRetryPolicy(options.policy);
  const sleep = options.sleepFn ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const now = options.nowFn ?? Date.now;
  return {
    async execute<T>(params: ExecuteWithRetryParams<T>): Promise<{ result?: T; error?: unknown; metrics: RetryExecutionMetric[] }> {
      const metrics: RetryExecutionMetric[] = [];
      const started = now();
      for (let attempt = 1; attempt <= 4; attempt++) {
        const start = now();
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const deadline = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(Object.assign(new Error('Request timeout'), { kind: 'timeout' }));
            }, Math.min(timeout, Math.max(1, budget - (start - started))));
          });
          const result = await Promise.race([Promise.resolve().then(() => params.operation(controller.signal)), deadline]);
          metrics.push({ attempt, status: 200, plannedDelayMs: 0, actualDelayMs: 0,
            durationMs: Math.max(0, now() - start), stopReason: 'success' });
          return { result, metrics };
        } catch (error) {
          const detail = error && typeof error === 'object' ? error as Record<string, unknown> : {};
          // Contract, authorization and decoding errors must never be mistaken for timeouts.
          const status = controller.signal.aborted || detail.kind === 'timeout' || detail.name === 'AbortError' ? 'timeout' :
            typeof detail.status === 'number' ? detail.status : 0;
          const plan = planRetry({ method: params.method, status, attempt,
            ...(params.idempotencyKey === undefined ? {} : { idempotencyKey: params.idempotencyKey }),
            ...(typeof detail.retryAfterMs === 'number' ? { retryAfterMs: detail.retryAfterMs } : {}) });
          const durationMs = Math.max(0, now() - start);
          const exhausted = now() - started + plan.delayMs >= budget;
          if (!plan.retry || exhausted) {
            metrics.push({ attempt, status, plannedDelayMs: 0, actualDelayMs: 0, durationMs,
              stopReason: exhausted ? 'budget' : plan.requiresStableIdempotencyKey ? 'missing_idempotency_key' :
                attempt >= (options.policy?.maxAttempts ?? 4) ? 'max_attempts' : 'non_transient' });
            return { error, metrics };
          }
          if (timer !== undefined) clearTimeout(timer);
          const sleepStart = now();
          await sleep(plan.delayMs);
          metrics.push({ attempt, status, plannedDelayMs: plan.delayMs,
            actualDelayMs: Math.max(0, now() - sleepStart), durationMs });
        } finally { if (timer !== undefined) clearTimeout(timer); }
      }
      return { error: new Error('Retry limit'), metrics };
    },
  };
}
