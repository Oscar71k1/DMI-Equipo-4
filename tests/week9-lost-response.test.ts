import { createRetryExecutor } from '../src/application/retryExecutor';

describe('Week 9 - Ejecución de Reintentos y Respuesta Perdida tras Guardar', () => {
  it('ejecuta reintentos acotados y registra métricas de espera', async () => {
    let callCount = 0;
    const delays: number[] = [];

    const executor = createRetryExecutor({
      maxTimeoutMs: 1000,
      sleepFn: async (ms) => {
        delays.push(ms);
      },
    });

    const { result, metrics } = await executor.execute({
      method: 'POST',
      idempotencyKey: 'stable-key-001',
      operation: async () => {
        callCount++;
        if (callCount < 3) {
          const err = new Error('Gateway Timeout');
          (err as any).status = 504;
          throw err;
        }
        return { ok: true, data: 'confirmado' };
      },
    });

    expect(result).toEqual({ ok: true, data: 'confirmado' });
    expect(callCount).toBe(3);
    expect(delays).toEqual([250, 500]);
    expect(metrics).toHaveLength(3);
    expect(metrics[2]?.stopReason).toBe('success');
  });

  it('detiene la ejecución inmediatamente si un POST carece de clave de idempotencia', async () => {
    let callCount = 0;
    const executor = createRetryExecutor();

    const { error, metrics } = await executor.execute({
      method: 'POST',
      operation: async () => {
        callCount++;
        const err = new Error('Server Error');
        (err as any).status = 500;
        throw err;
      },
    });

    expect(error).toBeDefined();
    expect(callCount).toBe(1); // Jamás se reintenta
    expect(metrics[0]?.stopReason).toBe('missing_idempotency_key');
  });

  it('F-LOST-01: simula timeout_after_commit y recupera sobre con duplicate: true', async () => {
    // Estado del servidor simulado en memoria
    const serverState = {
      incident: { id: 'campus-inc-001', version: 1, status: 'assigned' },
      appliedOperations: new Map<string, { bodyHash: string; response: any }>(),
      mutationCount: 0,
    };

    const idempotencyKey = 'op-resolve-001';
    const actionBody = { action: 'resolve', diagnosis: 'Filtro reemplazado' };
    
    // Servidor con escenario timeout_after_commit
    const simulateServerAction = async (key: string, body: typeof actionBody, timeoutScenario: boolean) => {
      // 1. Verificar si ya fue aplicada por idempotencia
      if (serverState.appliedOperations.has(key)) {
        const prev = serverState.appliedOperations.get(key)!;
        if (prev.bodyHash !== JSON.stringify(body)) {
          const err = new Error('Idempotency key reused with different payload');
          (err as any).status = 409;
          throw err;
        }
        return { ...prev.response, duplicate: true };
      }

      // 2. Aplicar mutación en servidor (commit)
      serverState.incident.status = 'resolved';
      serverState.incident.version += 1;
      serverState.mutationCount += 1;

      const response = {
        operationId: key,
        incident: { ...serverState.incident },
        duplicate: false,
      };
      serverState.appliedOperations.set(key, { bodyHash: JSON.stringify(body), response });

      // 3. Simular retardo de red tras guardar
      if (timeoutScenario) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return response;
    };

    // Intento 1: timeout configurado en 100ms para perder la respuesta tras el commit
    let clientAttempt = 0;
    let finalResponse: any = null;

    // Primer intento con timeout agresivo
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 100);
      await Promise.race([
        simulateServerAction(idempotencyKey, actionBody, true),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            const err = new Error('AbortError');
            err.name = 'AbortError';
            reject(err);
          });
        }),
      ]);
      clearTimeout(timer);
    } catch {
      clientAttempt = 1; // El cliente registró fallo por timeout
    }

    expect(clientAttempt).toBe(1);
    // Aunque el cliente dio timeout, el servidor sí guardó exactamente 1 mutación
    expect(serverState.mutationCount).toBe(1);
    expect(serverState.incident.version).toBe(2);

    // Intento 2 (Replay): reenvía exactamente la misma clave y payload
    finalResponse = await simulateServerAction(idempotencyKey, actionBody, false);

    // El replay devuelve confirmación con duplicate: true sin incrementar versión ni mutaciones
    expect(finalResponse.duplicate).toBe(true);
    expect(finalResponse.operationId).toBe(idempotencyKey);
    expect(finalResponse.incident.version).toBe(2);
    expect(serverState.mutationCount).toBe(1); // Exactamente una sola mutación

    // Caso negativo: misma clave con otro cuerpo debe lanzar 409
    await expect(
      simulateServerAction(idempotencyKey, { action: 'resolve', diagnosis: 'Otro texto' }, false)
    ).rejects.toMatchObject({ status: 409 });
  });
});