type InFlightRequest = {
  promise: Promise<unknown>;
  controller: AbortController;
};

const inFlightRequests = new Map<string, InFlightRequest>();

export function getRequestKey(method: string, url: string): string {
  return `${method}:${url}`;
}

export function isRequestInFlight(key: string): boolean {
  return inFlightRequests.has(key);
}

export function getInFlightRequest<T>(key: string): Promise<T> | null {
  const request = inFlightRequests.get(key);
  return request ? (request.promise as Promise<T>) : null;
}

export function registerRequest<T>(
  key: string,
  promise: Promise<T>,
  controller: AbortController
): Promise<T> {
  inFlightRequests.set(key, { promise, controller });

  const cleanup = () => inFlightRequests.delete(key);
  promise.then(cleanup, cleanup);

  return promise;
}

export function cancelRequest(key: string): boolean {
  const request = inFlightRequests.get(key);
  if (request) {
    request.controller.abort();
    inFlightRequests.delete(key);
    return true;
  }
  return false;
}

export function cancelRequestsMatching(pattern: string): number {
  let cancelled = 0;
  for (const [key, request] of inFlightRequests.entries()) {
    if (key.includes(pattern)) {
      request.controller.abort();
      inFlightRequests.delete(key);
      cancelled++;
    }
  }
  return cancelled;
}

export function createAbortController(): AbortController {
  return new AbortController();
}
