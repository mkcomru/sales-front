import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { PromptAddon, CreatePromptAddonRequest, UpdatePromptAddonRequest } from '../types/api';

export const promptAddonsService = {
  async list(companyId: number): Promise<PromptAddon[]> {
    const data = await api(apiClient.get<PromptAddon[]>(API_ENDPOINTS.PROMPT_ADDONS.LIST(companyId)));
    return Array.isArray(data) ? data : [];
  },

  async get(companyId: number, addonId: number): Promise<PromptAddon> {
    return api(apiClient.get<PromptAddon>(API_ENDPOINTS.PROMPT_ADDONS.BY_ID(companyId, addonId)));
  },

  async create(companyId: number, data: CreatePromptAddonRequest): Promise<PromptAddon> {
    return api(apiClient.post<PromptAddon>(API_ENDPOINTS.PROMPT_ADDONS.LIST(companyId), data));
  },

  async update(companyId: number, addonId: number, data: UpdatePromptAddonRequest): Promise<PromptAddon> {
    return api(apiClient.patch<PromptAddon>(API_ENDPOINTS.PROMPT_ADDONS.BY_ID(companyId, addonId), data));
  },

  async delete(companyId: number, addonId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.PROMPT_ADDONS.BY_ID(companyId, addonId)));
  },
};
