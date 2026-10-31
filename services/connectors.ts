import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { Connector, ConnectorTypeCatalogEntry, CreateConnectorRequest } from '../types/api';

export const connectorsService = {
  async list(companyId: number): Promise<Connector[]> {
    return api(apiClient.get<Connector[]>(API_ENDPOINTS.COMPANIES.CONNECTORS(companyId)));
  },

  async syncMoreChats(companyId: number, connectorId: string): Promise<{ status: string; message?: string }> {
    return api(
      apiClient.post<{ status: string; message?: string }>(
        API_ENDPOINTS.COMPANIES.CONNECTOR_SYNC_MORE_CHATS(companyId, connectorId),
      ),
    );
  },

  async getCatalog(): Promise<ConnectorTypeCatalogEntry[]> {
    try {
      const response = await apiClient.get<{ catalog: ConnectorTypeCatalogEntry[] }>(
        API_ENDPOINTS.CONNECTORS.CATALOG
      );
      return response.data.catalog ?? [];
    } catch {
      return [];
    }
  },

  async create(companyId: number, data: CreateConnectorRequest): Promise<Connector> {
    return api(apiClient.post<Connector>(API_ENDPOINTS.COMPANIES.CONNECTORS(companyId), data));
  },

  async update(id: number, data: Partial<Connector>): Promise<Connector> {
    return api(apiClient.patch<Connector>(API_ENDPOINTS.CONNECTORS.UPDATE(id), data));
  },

  async delete(id: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.CONNECTORS.DELETE(id)));
  },
};
