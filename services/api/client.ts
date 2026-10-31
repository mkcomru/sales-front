import axios, { AxiosHeaders, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../config/env';
import { handleApiError } from '../../utils/errors';
import { refreshAccessToken } from '../../utils/tokenRefresh';

/** Abort hung requests so UI can leave loading state (axios default is no timeout). */
const API_REQUEST_TIMEOUT_MS = 60_000;

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (config.data instanceof FormData) {
        const headers = AxiosHeaders.from(config.headers);
        headers.delete('Content-Type');
        config.headers = headers;
      }

      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const pathParts = window.location.pathname.split('/');
      const companyIdFromUrl = pathParts[1];

      if (companyIdFromUrl && !isNaN(Number(companyIdFromUrl)) && config.headers) {
        config.headers['X-Company-ID'] = companyIdFromUrl;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const isTransportError = originalRequest?.url?.includes('/transport/');

      if (error.response?.status === 401 && !originalRequest._retry && !isTransportError) {
        originalRequest._retry = true;

        try {
          const { access_token } = await refreshAccessToken();

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          }

          return client(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('auth:logout'));
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();

export async function api<T>(request: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}
