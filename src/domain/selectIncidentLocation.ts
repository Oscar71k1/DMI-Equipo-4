import type { IncidentLocation } from '../campusops/contracts';

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -limit && value <= limit;
}

/**
 * Acepta unicamente un objeto con label textual no vacio y coordenadas numericas
 * finitas dentro de rango (el cero es valido). En cualquier otro caso devuelve la
 * captura manual tal como se recibio: sin inventar coordenadas, sin recortar el
 * texto y sin mutar las entradas. La etiqueta del proveedor tampoco se recorta.
 */
export function selectIncidentLocation(provider: unknown, manualLabel: string): IncidentLocation {
  if (typeof provider === 'object' && provider !== null && !Array.isArray(provider)) {
    const { label, latitude, longitude } = provider as Record<string, unknown>;
    if (isNonEmptyText(label) && isCoordinate(latitude, 90) && isCoordinate(longitude, 180)) {
      return { source: 'provider', label, latitude, longitude };
    }
  }
  return { source: 'manual', label: manualLabel };
}