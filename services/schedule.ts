import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { CompanyUserSchedule, WorkSchedule } from '../types/api';

export const scheduleService = {
  async getSchedule(companyUserId: number): Promise<CompanyUserSchedule> {
    return api(apiClient.get<CompanyUserSchedule>(API_ENDPOINTS.COMPANY_USERS.SCHEDULE(companyUserId)));
  },

  async updateCompanyUser(companyUserId: number, data: {
    work_schedule?: WorkSchedule;
    is_available?: boolean;
  }): Promise<void> {
    await api(apiClient.patch(API_ENDPOINTS.COMPANY_USERS.UPDATE(companyUserId), data));
  },
};
