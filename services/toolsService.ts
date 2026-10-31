import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { ToolGroupResponse } from '../types/api';

export const toolsService = {
  async getAvailableTools(companyId: number): Promise<ToolGroupResponse[]> {
    return api(apiClient.get<ToolGroupResponse[]>(API_ENDPOINTS.TOOLS.AVAILABLE(companyId)));
  },
};
