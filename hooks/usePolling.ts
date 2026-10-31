import { useEffect } from 'react';

interface UsePollingOptions {
  enabled: boolean;
  interval: number;
  callback: () => void | Promise<void>;
}

export function usePolling({ enabled, interval, callback }: UsePollingOptions) {
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      callback();
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, callback]);
}
