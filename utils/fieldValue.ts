export function normFieldValue(v: unknown): string | null {
  return v == null || v === '' ? null : String(v);
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  return normFieldValue(a) === normFieldValue(b);
}
