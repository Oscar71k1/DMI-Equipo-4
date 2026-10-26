export function deduplicateOperations<T extends { readonly operationId: string }>(
  operations: readonly T[]
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const op of operations) {
    if (!seen.has(op.operationId)) {
      seen.add(op.operationId);
      result.push(op);
    }
  }

  return result;
}