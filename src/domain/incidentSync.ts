export type SyncFields = Readonly<Record<string, unknown>>;

export type SyncSnapshot = Readonly<{
  id: string;
  version: number;
  fields: SyncFields;
}>;

export type SyncResolution =
  | Readonly<{ kind: 'merged'; fields: SyncFields }>
  | Readonly<{ kind: 'conflict'; fields: readonly string[] }>;

// Marca interna para "el campo no existe". No es lo mismo que null.
const ABSENT = Symbol('absent');

function read(fields: SyncFields, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : ABSENT;
}

// Igualdad por contenido JSON. El orden de las claves no importa, el de los arrays sí.
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => jsonEqual(item, b[index]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(right, key) && jsonEqual(left[key], right[key]),
  );
}

function copy<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

// Cada campo se compara completo. Por eso "work" (técnico + estado) es indivisible.
export function resolveSyncRecords(
  base: SyncSnapshot,
  local: SyncSnapshot,
  remote: SyncSnapshot,
): SyncResolution {
  const keys = new Set([
    ...Object.keys(base.fields),
    ...Object.keys(local.fields),
    ...Object.keys(remote.fields),
  ]);
  const merged: Record<string, unknown> = {};
  const conflicts: string[] = [];

  for (const key of [...keys].sort()) {
    const baseValue = read(base.fields, key);
    const localValue = read(local.fields, key);
    const remoteValue = read(remote.fields, key);
    const localChanged = !jsonEqual(baseValue, localValue);
    const remoteChanged = !jsonEqual(baseValue, remoteValue);

    let chosen: unknown;
    if (!localChanged && !remoteChanged) chosen = baseValue;
    else if (localChanged && !remoteChanged) chosen = localValue;
    else if (!localChanged && remoteChanged) chosen = remoteValue;
    else if (jsonEqual(localValue, remoteValue)) chosen = localValue;
    else {
      conflicts.push(key);
      continue;
    }
    if (chosen !== ABSENT) merged[key] = copy(chosen);
  }

  return conflicts.length > 0
    ? { kind: 'conflict', fields: conflicts }
    : { kind: 'merged', fields: merged };
}