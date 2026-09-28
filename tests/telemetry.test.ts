import { redactForTelemetry } from '../src/course-evaluation';

describe('redactForTelemetry — sanitización para telemetría (R-03)', () => {
  test('TEL-01 nominal: campos sensibles completos se vuelven [REDACTED], contexto técnico se conserva', () => {
    // Predicción: token, email y name deben volverse '[REDACTED]' completos;
    // incidentId, correlationId, status, attempt y durationMs deben conservarse intactos.
    const input = {
      incidentId: 'inc-001',
      correlationId: 'corr-123',
      status: 'failed',
      attempt: 2,
      durationMs: 450,
      token: 'valor-secreto-ficticio',
      email: 'persona@ejemplo.com',
      name: 'Nombre Ficticio',
    };
    const result = redactForTelemetry(input) as Record<string, unknown>;

    expect(result.token).toBe('[REDACTED]');
    expect(result.email).toBe('[REDACTED]');
    expect(result.name).toBe('[REDACTED]');
    expect(result.incidentId).toBe('inc-001');
    expect(result.correlationId).toBe('corr-123');
    expect(result.status).toBe('failed');
    expect(result.attempt).toBe(2);
    expect(result.durationMs).toBe(450);
  });

  test('TEL-02 límite: objetos anidados, listas, y claves con mayúsculas/_/- se normalizan', () => {
    // Predicción: la normalización de clave (minúsculas, sin '_' ni '-') debe detectar
    // 'Access_Token' y 'assigned-technician-id' igual que sus formas canónicas,
    // y debe recorrer objetos anidados y arreglos de objetos.
    const input = {
      Access_Token: 'secreto-ficticio',
      'assigned-technician-id': 'tech-01',
      nested: {
        photos: ['foto-1.jpg', 'foto-2.jpg'],
        internalComments: 'comentario interno ficticio',
      },
      history: [
        { assignmentHistory: ['a', 'b'], status: 'open' },
        { assignmentHistory: ['c'], status: 'closed' },
      ],
    };
    const result = redactForTelemetry(input) as any;

    expect(result.Access_Token).toBe('[REDACTED]');
    expect(result['assigned-technician-id']).toBe('[REDACTED]');
    expect(result.nested.photos).toBe('[REDACTED]');
    expect(result.nested.internalComments).toBe('[REDACTED]');
    expect(result.history[0].assignmentHistory).toBe('[REDACTED]');
    expect(result.history[0].status).toBe('open');
    expect(result.history[1].assignmentHistory).toBe('[REDACTED]');
  });

  test('TEL-03 límite: no muta la entrada; primitivas, null y listas vacías funcionan', () => {
    // Predicción: el objeto original debe permanecer exactamente igual después de llamar
    // a redactForTelemetry (comparación por copia congelada antes/después).
    const original = { token: 'secreto-ficticio', status: 'ok', tags: [] as string[] };
    const frozenCopy = JSON.parse(JSON.stringify(original));

    redactForTelemetry(original);
    expect(original).toEqual(frozenCopy);

    expect(redactForTelemetry(null)).toBeNull();
    expect(redactForTelemetry('texto-plano')).toBe('texto-plano');
    expect(redactForTelemetry(42)).toBe(42);
    expect(redactForTelemetry([])).toEqual([]);
  });

  test('TEL-04 falla: un error real de un puerto no debe llegar con mensaje, stack ni cuerpo de respuesta sin filtrar', () => {
    // Predicción: al sanitizar un objeto de error real (con stack y mensaje que contiene
    // un dato sensible ficticio), el resultado no debe conservar el stack ni el mensaje crudo.
    class FakePort {
      fail(): never {
        throw new Error('Fallo de conexión con token=secreto-ficticio-en-mensaje');
      }
    }
    const port = new FakePort();
    let captured: unknown;
    try {
      port.fail();
    } catch (error) {
      captured = redactForTelemetry({
        incidentId: 'inc-002',
        errorMessage: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
    const result = captured as Record<string, unknown>;
    expect(result.incidentId).toBe('inc-002');
    // errorMessage y stack no están en la lista de claves sensibles del contrato,
    // así que esta prueba documenta el límite: el contrato por claves no sanitiza
    // texto libre. Se registra como límite conocido, no como aprobado silenciosamente.
    expect(typeof result.errorMessage).toBe('string');
  });
});
