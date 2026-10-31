import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeEvent } from './useWebSocket';
import { useRealtimeEvent } from './useRealtimeEvent';

export function useRealtimeRefresh(
  topic: string,
  refetch: () => void,
  debounceMs: number = 300
): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(
    (_event: RealtimeEvent) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        refetchRef.current();
      }, debounceMs);
    },
    [debounceMs]
  );

  useRealtimeEvent(topic, handler);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
