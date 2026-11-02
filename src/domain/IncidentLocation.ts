export type IncidentLocation =
  | Readonly<{ source: 'provider'; label: string; latitude: number; longitude: number }>
  | Readonly<{ source: 'manual'; label: string }>;
export function selectIncidentLocation(provider: unknown, manualLabel: string): IncidentLocation {
  if (provider && typeof provider === 'object' && !Array.isArray(provider)) {
    const p = provider as Record<string, unknown>;
    if (!('error' in p) && !('status' in p) && typeof p.label === 'string' && p.label.trim() &&
        typeof p.latitude === 'number' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
        typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) {
      return { source: 'provider', label: p.label, latitude: p.latitude, longitude: p.longitude };
    }
  }
  return { source: 'manual', label: manualLabel };
}
export interface LocationSearchPort {
  search(query: string): Promise<unknown>;
}
