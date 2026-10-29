import { planRetry, type HttpMethod, type RetryPlan } from './retryPolicy';

export type RetryExecutionMetric = {
  attempt: number;
  status: number | 'timeout';
  plannedDelayMs: number;
  actualDelayMs: number;
  durationMs: number;
  stopReason?: 'success' | 'max_attempts' | 'non_transient' | 'missing_idempotency_key';
};

export type RetryExecutorOptions = {
  maxTimeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
  nowFn?: () => number;
};

export type ExecuteWithRetryParams<T> = {
  method: HttpMethod;
  idempotencyKey?: string;
  operation: (signal: AbortSignal) => Promise<T>;
};

export function createRetryExecutor(options: RetryExecutorOptions = {}) {
  const maxTimeoutMs = options.maxTimeoutMs ?? 5000;
  const sleep = options.sleepFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.nowFn ?? (() => Date.now());

  return {
    async execute<T>(params: ExecuteWithRetryParams<T>): Promise<{
      result?: T;
      error?: unknown;
      metrics: RetryExecutionMetric[];
    }> {
      const { method, idempotencyKey, operation } = params;
      const metrics: RetryExecutionMetric[] = [];
      let attempt = 1;

      while (true) {
        const startTime = now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), maxTimeoutMs);

        try {
          const result = await operation(controller.signal);
          clearTimeout(timer);
          const durationMs = now() - startTime;

          metrics.push({
            attempt,
            status: 200,
            plannedDelayMs: 0,
            actualDelayMs: 0,
            durationMs,
            stopReason: 'success',
          });

          return { result, metrics };
        } catch (err: unknown) {
          clearTimeout(timer);
          const durationMs = now() - startTime;

          const isAbort =
            (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') ||
            controller.signal.aborted;

          const httpStatus: number | 'timeout' = isAbort
            ? 'timeout'
            : err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
            ? (err as { status: number }).status
            : 'timeout';

          const retryAfterMs =
            err && typeof err === 'object' && 'retryAfterMs' in err && typeof (err as { retryAfterMs: unknown }).retryAfterMs === 'number'
            ? (err as { retryAfterMs: number }).retryAfterMs
            : undefined;

          const plan: RetryPlan = planRetry({
            method,
            status: httpStatus,
            attempt,
            ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
            ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
          });

          if (!plan.retry) {
            const stopReason = plan.requiresStableIdempotencyKey
              ? 'missing_idempotency_key'
              : attempt >= 4
              ? 'max_attempts'
              : 'non_transient';

            metrics.push({
              attempt,
              status: httpStatus,
              plannedDelayMs: 0,
              actualDelayMs: 0,
              durationMs,
              stopReason,
            });

            return { error: err, metrics };
          }

          const sleepStart = now();
          await sleep(plan.delayMs);
          const actualDelayMs = now() - sleepStart;

          metrics.push({
            attempt,
            status: httpStatus,
            plannedDelayMs: plan.delayMs,
            actualDelayMs,
            durationMs,
          });

          attempt++;
        }
      }
    },
  };
}