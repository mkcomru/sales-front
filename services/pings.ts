import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { PingRule, CreatePingRuleRequest, UpdatePingRuleRequest } from '../types/api';

export const pingsService = {
  async list(companyId: number, stageId: number): Promise<PingRule[]> {
    const data = await api(apiClient.get<PingRule[]>(API_ENDPOINTS.STAGES.PINGS(companyId, stageId)));
    return Array.isArray(data) ? data : [];
  },

  async create(companyId: number, stageId: number, data: CreatePingRuleRequest): Promise<PingRule> {
    return api(apiClient.post<PingRule>(API_ENDPOINTS.STAGES.PINGS(companyId, stageId), data));
  },

  async update(companyId: number, pingId: number, data: UpdatePingRuleRequest): Promise<PingRule> {
    return api(apiClient.patch<PingRule>(API_ENDPOINTS.PINGS.BY_ID(companyId, pingId), data));
  },

  async delete(companyId: number, pingId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.PINGS.BY_ID(companyId, pingId)));
  },
};
