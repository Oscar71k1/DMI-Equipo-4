import { resolveSync, deepEqual } from '../src/domain/incidentSync';
import { deduplicateOperations } from '../src/domain/deduplicateOperations';
import type { SyncRecord } from '../src/course-evaluation/contracts';

describe('Week 8 - Sincronización y Deduplicación Pura', () => {
  describe('deepEqual', () => {
    it('compara objetos como iguales ignorando el orden de las propiedades', () => {
      const objA = { status: 'assigned', assignedTechnicianId: 'tech-1' };
      const objB = { assignedTechnicianId: 'tech-1', status: 'assigned' };
      expect(deepEqual(objA, objB)).toBe(true);
    });

    it('es estricto con el orden en los arreglos', () => {
      expect(deepEqual([1, 2], [2, 1])).toBe(false);
    });
  });

  describe('resolveSync (3-way merge)', () => {
    const base: SyncRecord = {
      id: 'inc-01',
      version: 1,
      fields: {
        title: 'Fuga de agua',
        priority: 'low',
        work: { assignedTechnicianId: 'tech-1', status: 'assigned' },
      },
    };

    it('conserva la base si nadie realizó cambios', () => {
      const res = resolveSync(base, base, base);
      expect(res).toEqual({
        kind: 'merged',
        fields: base.fields,
      });
    });

    it('conserva el cambio unilateral local', () => {
      const local: SyncRecord = {
        ...base,
        fields: { ...base.fields, priority: 'high' },
      };
      const res = resolveSync(base, local, base);
      expect(res).toEqual({
        kind: 'merged',
        fields: { ...base.fields, priority: 'high' },
      });
    });

    it('conserva cambios unilaterales independientes en campos distintos', () => {
      const local: SyncRecord = {
        ...base,
        fields: { ...base.fields, priority: 'high' },
      };
      const remote: SyncRecord = {
        ...base,
        fields: { ...base.fields, title: 'Fuga grave de agua' },
      };
      const res = resolveSync(base, local, remote);
      expect(res).toEqual({
        kind: 'merged',
        fields: {
          title: 'Fuga grave de agua',
          priority: 'high',
          work: { assignedTechnicianId: 'tech-1', status: 'assigned' },
        },
      });
    });

    it('marca conflicto en el campo compuesto work ante reasignación concurrente', () => {
      const local: SyncRecord = {
        ...base,
        fields: {
          ...base.fields,
          work: { assignedTechnicianId: 'tech-1', status: 'in_progress' },
        },
      };
      const remote: SyncRecord = {
        ...base,
        fields: {
          ...base.fields,
          work: { assignedTechnicianId: 'tech-2', status: 'assigned' },
        },
      };

      const res = resolveSync(base, local, remote);
      expect(res).toEqual({
        kind: 'conflict',
        fields: ['work'],
      });
    });

    it('ordena alfabéticamente múltiples campos en conflicto', () => {
      const local: SyncRecord = {
        ...base,
        fields: {
          ...base.fields,
          zField: 'local-z',
          aField: 'local-a',
        },
      };
      const remote: SyncRecord = {
        ...base,
        fields: {
          ...base.fields,
          zField: 'remote-z',
          aField: 'remote-a',
        },
      };

      const res = resolveSync(base, local, remote);
      expect(res).toEqual({
        kind: 'conflict',
        fields: ['aField', 'zField'],
      });
    });
  });

  describe('deduplicateOperations', () => {
    it('conserva la primera aparición y mantiene el orden relativo', () => {
      const ops = [
        { operationId: 'op-1', payload: 'primer valor' },
        { operationId: 'op-2', payload: 'segundo valor' },
        { operationId: 'op-1', payload: 'valor colisionado que debe ignorarse' },
      ];

      const deduplicated = deduplicateOperations(ops);
      expect(deduplicated).toEqual([
        { operationId: 'op-1', payload: 'primer valor' },
        { operationId: 'op-2', payload: 'segundo valor' },
      ]);
    });

    it('no muta el arreglo original', () => {
      const ops = Object.freeze([
        { operationId: 'op-1' },
        { operationId: 'op-1' },
      ]);
      expect(() => deduplicateOperations(ops)).not.toThrow();
    });
  });
});