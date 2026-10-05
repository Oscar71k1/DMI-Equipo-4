import { parseRemoteResource } from '../src/course-evaluation';

describe('parseRemoteResource — contrato del sobre remoto', () => {
  test('DTO-01 nominal: sobre válido con payload objeto conserva sus valores', () => {
    // Predicción: un sobre bien formado debe devolver ok:true con id, version,
    // status y payload exactamente como llegaron.
    const input = {
      id: 'inc-001',
      version: 3,
      status: 'open',
      payload: { category: 'electrical', description: 'Fuga ficticia' },
    };
    const result = parseRemoteResource(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(input);
    }
  });

  test('DTO-02 boundary: payload null, version 0 y campo futuro del sobre', () => {
    // Predicción: el parser acepta payload null y version 0 como válidos,
    // e ignora un campo adicional desconocido sin rechazar el sobre.
    const input = {
      id: 'inc-002',
      version: 0,
      status: 'closed',
      payload: null,
      futureField: 'algo-que-no-existe-todavia',
    };
    const result = parseRemoteResource(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('inc-002');
      expect(result.value.version).toBe(0);
      expect(result.value.status).toBe('closed');
      expect(result.value.payload).toBeNull();
    }
  });

  test.each([
    ['id vacío', { id: '', version: 1, status: 'open', payload: null }],
    ['status vacío', { id: 'inc-003', version: 1, status: '', payload: null }],
    ['version textual', { id: 'inc-003', version: '1' as unknown as number, status: 'open', payload: null }],
    ['version negativa', { id: 'inc-003', version: -1, status: 'open', payload: null }],
    ['version fraccionaria', { id: 'inc-003', version: 1.5, status: 'open', payload: null }],
    ['entrada null', null],
    ['payload arreglo', { id: 'inc-003', version: 1, status: 'open', payload: [] as unknown }],
    ['payload ausente', { id: 'inc-003', version: 1, status: 'open' }],
  ])('DTO-03 failure: %s produce ok:false sin lanzar excepción', (_label, input) => {
    // Predicción: cada entrada inválida debe devolver ok:false, error:'contract',
    // sin que el parser lance una excepción no controlada.
    let result: ReturnType<typeof parseRemoteResource> | undefined;
    expect(() => {
      result = parseRemoteResource(input);
    }).not.toThrow();

    expect(result).toEqual({ ok: false, error: 'contract' });
  });

  test('no muta la entrada original', () => {
    // Predicción: el parser no debe modificar el objeto de entrada.
    const input = {
      id: 'inc-004',
      version: 2,
      status: 'open',
      payload: { foo: 'bar' },
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    parseRemoteResource(input);

    expect(input).toEqual(snapshot);
  });
});