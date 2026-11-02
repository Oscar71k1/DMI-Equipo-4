export type HttpMethod = 'GET' | 'POST';
export type RetryInput = Readonly<{
  method: HttpMethod; status: number | 'timeout'; attempt: number;
  retryAfterMs?: number; idempotencyKey?: string;
}>;
export type RetryPlan = Readonly<{ retry: boolean; delayMs: number; requiresStableIdempotencyKey: boolean }>;
export type RetryConfig = Readonly<{ maxAttempts: number; baseDelayMs: number; maxDelayMs: number }>;
export const DEFAULT_RETRY_CONFIG: RetryConfig = Object.freeze({ maxAttempts: 4, baseDelayMs: 250, maxDelayMs: 10000 });
export function createRetryPolicy(overrides: Partial<RetryConfig> = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...overrides };
  if (!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1 || config.maxAttempts > 4 ||
      !Number.isFinite(config.baseDelayMs) || config.baseDelayMs <= 0 ||
      !Number.isFinite(config.maxDelayMs) || config.maxDelayMs < config.baseDelayMs || config.maxDelayMs > 60000) {
    throw new Error('Invalid retry configuration');
  }
  return (input: RetryInput): RetryPlan => {
    const missing = input.method === 'POST' && !input.idempotencyKey?.trim();
    const stop = { retry: false, delayMs: 0, requiresStableIdempotencyKey: Boolean(missing) };
    if (missing || !Number.isInteger(input.attempt) || input.attempt < 1 || input.attempt >= config.maxAttempts) return stop;
    if (!(input.status === 'timeout' || input.status === 429 ||
        (Number.isInteger(input.status) && Number(input.status) >= 500 && Number(input.status) <= 599))) return stop;
    let delayMs = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** (input.attempt - 1));
    if (input.retryAfterMs !== undefined && Number.isFinite(input.retryAfterMs) && input.retryAfterMs >= 0) {
      // Never shorten Retry-After. A delay outside our budget stops automatic retries.
      if (input.retryAfterMs > config.maxDelayMs) return stop;
      delayMs = Math.ceil(input.retryAfterMs);
    }
    return { retry: true, delayMs, requiresStableIdempotencyKey: false };
  };
}
export const planRetry = createRetryPolicy();
export function parseRetryAfter(value: string | null, nowMs = Date.now()): number | undefined {
  if (!value?.trim()) return undefined;
  const text = value.trim();
  const delay = /^\d+(\.\d+)?$/.test(text) ? Number(text) * 1000 :
    /^[A-Za-z]{3},/.test(text) ? Date.parse(text) - nowMs : NaN;
  return Number.isFinite(delay) && delay >= 0 ? delay : undefined;
}
