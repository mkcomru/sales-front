import { useState, useEffect, useCallback, useRef, type DependencyList } from 'react';

interface UseAsyncResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAsync<T>(
  fetcher: (() => Promise<T>) | null,
  deps: DependencyList,
): UseAsyncResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(fetcher !== null);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async () => {
    const f = fetcherRef.current;
    if (!f) {
      setIsLoading(false);
      return;
    }
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await f();
      if (id === fetchIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}
