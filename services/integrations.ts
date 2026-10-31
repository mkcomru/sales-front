import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type {
  IntegrationResponse,
  IntegrationCreate,
  IntegrationUpdate,
  ProviderCatalogEntry,
} from '../types/api';

export const integrationsService = {
  async catalog(companyId: number): Promise<ProviderCatalogEntry[]> {
    return api(apiClient.get<ProviderCatalogEntry[]>(API_ENDPOINTS.INTEGRATIONS.CATALOG(companyId)));
  },

  async list(companyId: number): Promise<IntegrationResponse[]> {
    return api(apiClient.get<IntegrationResponse[]>(API_ENDPOINTS.INTEGRATIONS.LIST(companyId)));
  },

  async create(companyId: number, data: IntegrationCreate): Promise<IntegrationResponse> {
    return api(apiClient.post<IntegrationResponse>(API_ENDPOINTS.INTEGRATIONS.CREATE(companyId), data));
  },

  async update(companyId: number, integrationId: number, data: IntegrationUpdate): Promise<IntegrationResponse> {
    return api(apiClient.patch<IntegrationResponse>(API_ENDPOINTS.INTEGRATIONS.UPDATE(companyId, integrationId), data));
  },

  async delete(companyId: number, integrationId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.INTEGRATIONS.DELETE(companyId, integrationId)));
  },
};
