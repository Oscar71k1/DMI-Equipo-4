import type { SyncRecord } from '../course-evaluation/contracts';

export type SyncResult =
  | Readonly<{ kind: 'merged'; fields: Record<string, unknown> }>
  | Readonly<{ kind: 'conflict'; fields: readonly string[] }>;

/**
 * Compara dos valores JSON por contenido estructural.
 * Los objetos son iguales sin importar el orden de inserción de sus claves.
 * Los arreglos son estrictos en longitud y posición.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a)) {
    const bArr = b as readonly unknown[];
    if (a.length !== bArr.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], bArr[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}

/**
 * Resuelve la combinación de 3 versiones (base, local, remote).
 * No muta ninguno de los objetos de entrada.
 * Si existen conflictos, devuelve la lista ordenada alfabéticamente.
 */
export function resolveSync(
  base: SyncRecord,
  local: SyncRecord,
  remote: SyncRecord
): SyncResult {
  const baseFields = base?.fields ?? {};
  const localFields = local?.fields ?? {};
  const remoteFields = remote?.fields ?? {};

  const allKeys = Array.from(
    new Set([
      ...Object.keys(baseFields),
      ...Object.keys(localFields),
      ...Object.keys(remoteFields),
    ])
  );

  const conflicts: string[] = [];
  const merged: Record<string, unknown> = {};

  for (const key of allKeys) {
    const valBase = baseFields[key];
    const valLocal = localFields[key];
    const valRemote = remoteFields[key];

    const localChanged = !deepEqual(valBase, valLocal);
    const remoteChanged = !deepEqual(valBase, valRemote);

    if (!localChanged && !remoteChanged) {
      if (valBase !== undefined) merged[key] = valBase;
    } else if (localChanged && !remoteChanged) {
      if (valLocal !== undefined) merged[key] = valLocal;
    } else if (!localChanged && remoteChanged) {
      if (valRemote !== undefined) merged[key] = valRemote;
    } else {
      // Ambos modificaron el campo respecto a la base
      if (deepEqual(valLocal, valRemote)) {
        if (valLocal !== undefined) merged[key] = valLocal;
      } else {
        conflicts.push(key);
      }
    }
  }

  if (conflicts.length > 0) {
    conflicts.sort();
    return {
      kind: 'conflict',
      fields: conflicts,
    };
  }

  return {
    kind: 'merged',
    fields: merged,
  };
}