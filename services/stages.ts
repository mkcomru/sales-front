import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { StageTemplate, CreateStageRequest, UpdateStageRequest } from '../types/api';

export const stagesService = {
  async list(companyId: number): Promise<StageTemplate[]> {
    const data = await api(apiClient.get<StageTemplate[]>(API_ENDPOINTS.STAGES.LIST(companyId)));
    return Array.isArray(data) ? data : [];
  },

  async create(companyId: number, data: CreateStageRequest): Promise<StageTemplate> {
    return api(apiClient.post<StageTemplate>(API_ENDPOINTS.STAGES.LIST(companyId), data));
  },

  async update(companyId: number, stageId: number, data: UpdateStageRequest): Promise<StageTemplate> {
    return api(apiClient.patch<StageTemplate>(API_ENDPOINTS.STAGES.BY_ID(companyId, stageId), data));
  },

  async delete(companyId: number, stageId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.STAGES.BY_ID(companyId, stageId)));
  },

  async reorder(companyId: number, stageIds: number[]): Promise<void> {
    await api(apiClient.put(API_ENDPOINTS.STAGES.REORDER(companyId), { stage_ids: stageIds }));
  },
};
