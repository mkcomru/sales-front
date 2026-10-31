import { useState, useCallback } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  exponentialBackoff?: boolean;
}

export function useRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): {
  execute: T;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
} {
  const { maxAttempts = 3, delay = 1000, exponentialBackoff = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      setIsLoading(true);
      setError(null);
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          setRetryCount(attempt);
          const result = await fn(...args);
          setRetryCount(0);
          setIsLoading(false);
          return result as ReturnType<T>;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          
          // Don't retry on certain errors (e.g., 401, 403, 404)
          if (err && typeof err === 'object' && 'response' in err) {
            const axiosError = err as { response?: { status?: number } };
            if (axiosError.response?.status === 401 || 
                axiosError.response?.status === 403 || 
                axiosError.response?.status === 404) {
              setError(lastError);
              setIsLoading(false);
              throw lastError;
            }
          }

          // If not the last attempt, wait before retrying
          if (attempt < maxAttempts - 1) {
            const waitTime = exponentialBackoff ? delay * Math.pow(2, attempt) : delay;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      setError(lastError);
      setIsLoading(false);
      throw lastError;
    },
    [fn, maxAttempts, delay, exponentialBackoff]
  ) as T;

  return {
    execute,
    isLoading,
    error,
    retryCount,
  };
}
