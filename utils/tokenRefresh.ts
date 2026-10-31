import axios from 'axios';
import { API_BASE_URL } from '../config/env';

let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;

/**
 * Shared token refresh with deduplication.
 * Multiple concurrent callers get the same in-flight promise,
 * preventing double-revocation of the refresh token.
 */
export async function refreshAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const storedRefreshToken = localStorage.getItem('refresh_token');
  if (!storedRefreshToken) {
    throw new Error('No refresh token available');
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/api/v1/auth/refresh`, {
      refresh_token: storedRefreshToken,
    })
    .then((response) => {
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      return { access_token, refresh_token };
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
