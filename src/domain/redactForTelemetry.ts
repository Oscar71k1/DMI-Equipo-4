const sensitiveKeys = new Set([
  'authorization', 'password', 'token', 'accesstoken', 'refreshtoken',
  'email', 'displayname', 'name', 'userid', 'reporterid', 'technicianid',
  'assignedtechnicianid', 'location', 'latitude', 'longitude', 'photos',
  'evidence', 'internalcomments', 'assignmenthistory',
  'message', 'errormessage', 'stack',
]);

/** Copies telemetry data; callers must still allowlist context and avoid raw text. */
export function redactForTelemetry(input: unknown): unknown {
  const ancestors = new WeakSet<object>();
  function visit(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Error) return '[REDACTED]';
    if (ancestors.has(value)) return '[CIRCULAR]';
    ancestors.add(value);
    const output = Array.isArray(value)
      ? value.map(visit)
      : Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKeys.has(key.toLowerCase().replace(/[_-]/g, ''))
          ? '[REDACTED]' : visit(entry),
      ]));
    ancestors.delete(value);
    return output;
  }
  return visit(input);
}
