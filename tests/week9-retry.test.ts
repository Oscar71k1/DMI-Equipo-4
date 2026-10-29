import { planRetry } from '../src/application/retryPolicy';

describe('Week 9 - Política de Reintentos (planRetry)', () => {
  it('GET + 429 + intento 1 + retryAfterMs: 800 devuelve exactamente 800ms sin alterar', () => {
    const plan = planRetry({
      method: 'GET',
      status: 429,
      attempt: 1,
      retryAfterMs: 800,
    });

    expect(plan).toEqual({
      retry: true,
      delayMs: 800,
      requiresStableIdempotencyKey: false,
    });
  });

  it('POST sin clave estable devuelve requiresStableIdempotencyKey: true y no reintenta', () => {
    const planSinClave = planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 1,
    });
    expect(planSinClave).toEqual({
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: true,
    });

    const planClaveVacia = planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 1,
      idempotencyKey: '   ',
    });
    expect(planClaveVacia).toEqual({
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: true,
    });
  });

  it('POST + timeout + intento 1 + clave estable permite reintento seguro', () => {
    const plan = planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 1,
      idempotencyKey: 'op-stable-001',
    });

    expect(plan).toEqual({
      retry: true,
      delayMs: 250,
      requiresStableIdempotencyKey: false,
    });
  });

  it('Aumenta progresivamente la espera en intentos 1, 2 y 3', () => {
    const plan1 = planRetry({ method: 'GET', status: 'timeout', attempt: 1 });
    const plan2 = planRetry({ method: 'GET', status: 'timeout', attempt: 2 });
    const plan3 = planRetry({ method: 'GET', status: 'timeout', attempt: 3 });

    expect(plan1.delayMs).toBe(250);
    expect(plan2.delayMs).toBe(500);
    expect(plan3.delayMs).toBe(1000);
  });

  it('Corta definitivamente el reintento a partir de attempt >= 4', () => {
    const plan4 = planRetry({ method: 'GET', status: 'timeout', attempt: 4 });
    const plan5 = planRetry({ method: 'GET', status: 'timeout', attempt: 5 });

    expect(plan4).toEqual({ retry: false, delayMs: 0, requiresStableIdempotencyKey: false });
    expect(plan5).toEqual({ retry: false, delayMs: 0, requiresStableIdempotencyKey: false });
  });

  it('No reintenta errores definitivos (400, 401, 403, 404, 409, 422)', () => {
    const statuses = [400, 401, 403, 404, 409, 422];
    for (const status of statuses) {
      const plan = planRetry({
        method: 'POST',
        status,
        attempt: 1,
        idempotencyKey: 'key-123',
      });
      expect(plan.retry).toBe(false);
      expect(plan.delayMs).toBe(0);
    }
  });

  it('Maneja valores extremos, negativos o no finitos sin entrar en bucles', () => {
    const planNaN = planRetry({ method: 'GET', status: 'timeout', attempt: Number.NaN });
    const planNegativo = planRetry({ method: 'GET', status: 'timeout', attempt: -1 });

    expect(planNaN.retry).toBe(false);
    expect(planNegativo.retry).toBe(false);
  });
});