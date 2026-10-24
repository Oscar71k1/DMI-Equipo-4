import { deduplicateOperations, resolveSync } from '../src/course-evaluation';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const record = (version: number, fields: Record<string, unknown>) =>
  deepFreeze({ id: 'inc-1', version, fields });

describe('resolveSync — combinación de tres versiones', () => {
  test('SYN-01 sin cambios: conserva los campos de la base', () => {
    // Predicción: merged con los mismos campos, aunque la versión remota sea otra.
    const base = record(1, { title: 'A', priority: 1 });
    expect(resolveSync(base, record(1, { title: 'A', priority: 1 }), record(2, { title: 'A', priority: 1 })))
      .toEqual({ kind: 'merged', fields: { title: 'A', priority: 1 } });
  });

  test('SYN-02 cambio solo local o solo remoto: se conserva el que cambió', () => {
    // Predicción: gana el lado que sí cambió en cada campo.
    const base = record(1, { title: 'A', priority: 1 });
    expect(resolveSync(base, record(1, { title: 'Local', priority: 1 }), record(2, { title: 'A', priority: 1 })))
      .toEqual({ kind: 'merged', fields: { title: 'Local', priority: 1 } });
    expect(resolveSync(base, record(1, { title: 'A', priority: 1 }), record(2, { title: 'A', priority: 5 })))
      .toEqual({ kind: 'merged', fields: { title: 'A', priority: 5 } });
  });

  test('SYN-03 campos independientes: se conservan ambos cambios', () => {
    // Predicción: título viene del lado local y prioridad del remoto.
    const base = record(1, { title: 'A', priority: 1 });
    expect(resolveSync(base, record(1, { title: 'Local', priority: 1 }), record(2, { title: 'A', priority: 2 })))
      .toEqual({ kind: 'merged', fields: { title: 'Local', priority: 2 } });
  });

  test('SYN-04 mismo cambio en ambos lados, con otra referencia y otro orden de claves: sin conflicto falso', () => {
    // Predicción: igualdad por contenido, así que merged y no conflict.
    const base = record(1, { meta: { x: 0, y: 2 } });
    const local = record(1, { meta: { x: 1, y: 2 } });
    const remote = record(2, { meta: { y: 2, x: 1 } });
    expect(resolveSync(base, local, remote)).toEqual({ kind: 'merged', fields: { meta: { x: 1, y: 2 } } });
  });

  test('SYN-05 arrays: el orden cuenta como contenido', () => {
    // Predicción: arrays con distinto orden se consideran distintos (conflicto);
    // arrays idénticos en ambos lados no.
    const base = record(1, { tags: ['a', 'b'] });
    expect(resolveSync(base, record(1, { tags: ['b', 'a'] }), record(2, { tags: ['a', 'b', 'c'] })))
      .toEqual({ kind: 'conflict', fields: ['tags'] });
    expect(resolveSync(base, record(1, { tags: ['a', 'b', 'c'] }), record(2, { tags: ['a', 'b', 'c'] })))
      .toEqual({ kind: 'merged', fields: { tags: ['a', 'b', 'c'] } });
  });

  test('SYN-06 null y ausencia son cosas distintas', () => {
    // Predicción: quitar un campo localmente lo elimina del resultado;
    // agregar null localmente lo conserva como null.
    expect(resolveSync(record(1, { a: null }), record(1, {}), record(2, { a: null })))
      .toEqual({ kind: 'merged', fields: {} });
    expect(resolveSync(record(1, {}), record(1, { a: null }), record(2, {})))
      .toEqual({ kind: 'merged', fields: { a: null } });
  });

  test('SYN-07 varios conflictos: se reportan todos, ordenados por nombre', () => {
    // Predicción: ['a', 'b']; el campo c solo cambió en el remoto y no es conflicto.
    const base = record(1, { b: 1, a: 1, c: 1 });
    expect(resolveSync(base, record(1, { b: 2, a: 2, c: 1 }), record(2, { b: 3, a: 3, c: 2 })))
      .toEqual({ kind: 'conflict', fields: ['a', 'b'] });
  });

  test('SYN-08 work es un campo compuesto: reasignación remota contra inicio local es conflicto', () => {
    // Predicción: conflict en ['work'], sin mezclar "técnico 2" con "en proceso".
    const base = record(1, { work: { assignedTechnicianId: 'technician-1', status: 'assigned' } });
    const local = record(1, { work: { assignedTechnicianId: 'technician-1', status: 'in_progress' } });
    const remote = record(2, { work: { assignedTechnicianId: 'technician-2', status: 'assigned' } });
    expect(resolveSync(base, local, remote)).toEqual({ kind: 'conflict', fields: ['work'] });
  });
});

describe('deduplicateOperations — primera aparición por operationId', () => {
  test('DED-01 lista vacía y todos distintos', () => {
    // Predicción: vacía devuelve vacía; distintos conserva el orden.
    expect(deduplicateOperations([])).toEqual([]);
    const ops = deepFreeze([{ operationId: 'a', value: 1 }, { operationId: 'b', value: 2 }]);
    expect(deduplicateOperations(ops)).toEqual([ops[0], ops[1]]);
  });

  test('DED-02 duplicados separados: conserva la primera y el orden de primeras apariciones', () => {
    // Predicción: [a1, b, a2] devuelve [a1, b].
    const ops = deepFreeze([
      { operationId: 'a', value: 1 },
      { operationId: 'b', value: 2 },
      { operationId: 'a', value: 1 },
    ]);
    expect(deduplicateOperations(ops)).toEqual([ops[0], ops[1]]);
  });

  test('DED-03 mismo ID con contenido distinto: gana la primera, no se reemplaza', () => {
    // Predicción: se queda value 1 y se ignora value 99.
    const ops = deepFreeze([
      { operationId: 'op-1', value: 1 },
      { operationId: 'op-1', value: 99 },
    ]);
    expect(deduplicateOperations(ops)).toEqual([{ operationId: 'op-1', value: 1 }]);
  });

  test('DED-04 no muta la entrada y devuelve un arreglo nuevo', () => {
    // Predicción: la entrada congelada queda igual y el resultado no es el mismo arreglo.
    const ops = deepFreeze([{ operationId: 'a', value: 1 }, { operationId: 'a', value: 2 }]);
    const result = deduplicateOperations(ops);
    expect(result).not.toBe(ops);
    expect(ops).toHaveLength(2);
  });
});