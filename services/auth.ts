import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { LoginRequest, LoginResponse, RefreshTokenResponse } from '../types/api';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return api(apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      email: credentials.email.trim(),
      password: credentials.password,
    }));
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return api(apiClient.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      null,
      { headers: { Authorization: `Bearer ${refreshToken}` } }
    ));
  },
};
