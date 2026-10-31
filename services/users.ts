import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { User } from '../types/api';

export const usersService = {
  async getMe(): Promise<User> {
    return api(apiClient.get<User>(API_ENDPOINTS.USERS.ME));
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return api(apiClient.patch<User>(API_ENDPOINTS.USERS.ME, data));
  },
};
