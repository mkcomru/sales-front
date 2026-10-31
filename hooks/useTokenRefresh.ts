import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';
import { refreshAccessToken } from '../utils/tokenRefresh';

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (access token lives 15 min)

export function useTokenRefresh() {
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doRefresh = async () => {
    try {
      logger.debug('Proactive token refresh');
      await refreshAccessToken();
      logger.debug('Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('auth:logout'));
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      doRefresh().finally(() => {
        scheduleRefresh();
      });
    }, TOKEN_REFRESH_INTERVAL);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      return;
    }

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
}
