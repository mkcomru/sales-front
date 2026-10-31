// Type guards for runtime type checking

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function hasResponse(error: unknown): error is { response?: { status?: number; data?: unknown } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
}

export function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown }; message?: string } {
  return hasResponse(error);
}

export function isApiErrorResponse(data: unknown): data is { detail?: string | Array<{ msg?: string; message?: string }>; message?: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('detail' in data || 'message' in data)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}
