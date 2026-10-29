export type HttpMethod = 'GET' | 'POST';

export type RetryInput = Readonly<{
  method: HttpMethod;
  status: number | 'timeout';
  attempt: number;
  retryAfterMs?: number;
  idempotencyKey?: string;
}>;

export type RetryPlan = Readonly<{
  retry: boolean;
  delayMs: number;
  requiresStableIdempotencyKey: boolean;
}>;

const DEFAULT_DELAYS_MS: readonly number[] = [250, 500, 1000];
const MAX_ATTEMPTS = 4;

function isTransientStatus(status: number | 'timeout'): boolean {
  if (status === 'timeout') return true;
  if (!Number.isFinite(status)) return false;
  if (status === 429) return true;
  return status >= 500 && status <= 599;
}

function isValidIdempotencyKey(key?: string): boolean {
  return typeof key === 'string' && key.trim().length > 0;
}

export function planRetry(input: RetryInput): RetryPlan {
  const { method, status, attempt, retryAfterMs, idempotencyKey } = input;

  // 1. Validar intento: a partir del intento 4 no se permiten más reintentos
  if (!Number.isFinite(attempt) || attempt < 1 || attempt >= MAX_ATTEMPTS) {
    return {
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: false,
    };
  }

  // 2. Regla de seguridad para POST: requiere clave de idempotencia estable
  const hasStableKey = isValidIdempotencyKey(idempotencyKey);
  if (method === 'POST' && !hasStableKey) {
    return {
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: true,
    };
  }

  // 3. Evaluar si el fallo es transitorio
  if (!isTransientStatus(status)) {
    return {
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: false,
    };
  }

  // 4. Tratamiento de Retry-After explícito (ej. 429)
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return {
      retry: true,
      delayMs: Math.floor(retryAfterMs),
      requiresStableIdempotencyKey: false,
    };
  }

  // 5. Backoff exponencial progresivo por defecto (250ms, 500ms, 1000ms)
  const delayIndex = Math.min(Math.floor(attempt) - 1, DEFAULT_DELAYS_MS.length - 1);
  const delayMs = DEFAULT_DELAYS_MS[delayIndex] ?? 1000;

  return {
    retry: true,
    delayMs,
    requiresStableIdempotencyKey: false,
  };
}