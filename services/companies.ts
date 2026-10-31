import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { handleApiError } from '../utils/errors';
import type {
  CompanyField,
  CompanyFieldsResponse,
  BalanceResponse,
  TopUpRequest,
  TopUpResponse,
  LedgerListResponse,
  ThreadsResponse,
  ReactivateThreadsRequest,
  ReactivateThreadsResponse,
  CompanyDetailResponse,
  CompanyPatchPayload,
  AgentReadinessResponse,
} from '../types/api';

export const companiesService = {
  getById(companyId: number): Promise<CompanyDetailResponse> {
    return api(apiClient.get<CompanyDetailResponse>(API_ENDPOINTS.COMPANIES.BY_ID(companyId)));
  },

  getAgentReadiness(companyId: number): Promise<AgentReadinessResponse> {
    return api(
      apiClient.get<AgentReadinessResponse>(API_ENDPOINTS.COMPANIES.AGENT_READINESS(companyId)),
    );
  },

  patch(companyId: number, data: CompanyPatchPayload): Promise<CompanyDetailResponse> {
    return api(apiClient.patch<CompanyDetailResponse>(API_ENDPOINTS.COMPANIES.BY_ID(companyId), data));
  },

  async getConfig(companyId: number): Promise<Record<string, unknown>> {
    try {
      const response = await apiClient.get<Record<string, unknown>>(
        API_ENDPOINTS.COMPANIES.CONFIG(companyId)
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return {};
        }
      }
      handleApiError(error);
    }
  },

  async getFields(companyId: number): Promise<CompanyField[]> {
    const data = await api(apiClient.get<CompanyField[] | CompanyFieldsResponse>(
      API_ENDPOINTS.COMPANIES.FIELDS(companyId)
    ));
    if (Array.isArray(data)) return data;
    return data.items;
  },

  async listCompanyConnectors(companyId: number): Promise<unknown[]> {
    return api(apiClient.get<unknown[]>(API_ENDPOINTS.COMPANIES.CONNECTORS(companyId)));
  },

  async listMembers(companyId: number): Promise<unknown> {
    return api(apiClient.get(API_ENDPOINTS.COMPANIES.MEMBERS(companyId)));
  },

  async addMember(
    companyId: number,
    data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      role?: string;
    }
  ): Promise<{ id: number; user_id: number; first_name: string; last_name: string; email: string; role: string }> {
    return api(apiClient.post(API_ENDPOINTS.COMPANIES.MEMBERS(companyId), data));
  },

  async createField(companyId: number, data: Partial<CompanyField>): Promise<CompanyField> {
    return api(apiClient.post<CompanyField>(API_ENDPOINTS.COMPANIES.FIELDS(companyId), data));
  },

  async updateField(companyId: number, fieldId: number, data: Partial<CompanyField>): Promise<CompanyField> {
    return api(apiClient.patch<CompanyField>(API_ENDPOINTS.COMPANIES.FIELDS_BY_ID(companyId, fieldId), data));
  },

  async deleteField(companyId: number, fieldId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.COMPANIES.FIELDS_BY_ID(companyId, fieldId)));
  },

  async createFieldOption(companyId: number, fieldId: number, data: { value: string; order?: number }): Promise<unknown> {
    return api(apiClient.post(
      `${API_ENDPOINTS.COMPANIES.FIELDS_BY_ID(companyId, fieldId)}/options`,
      data
    ));
  },

  async deleteFieldOption(companyId: number, fieldId: number, optionId: number): Promise<void> {
    await api(apiClient.delete(
      `${API_ENDPOINTS.COMPANIES.FIELDS_BY_ID(companyId, fieldId)}/options/${optionId}`
    ));
  },

  async getBalance(companyId: number): Promise<BalanceResponse> {
    return api(apiClient.get<BalanceResponse>(API_ENDPOINTS.COMPANIES.BILLING.BALANCE(companyId)));
  },

  async topUp(companyId: number, data: TopUpRequest): Promise<TopUpResponse> {
    return api(apiClient.post<TopUpResponse>(API_ENDPOINTS.COMPANIES.BILLING.TOP_UP(companyId), data));
  },

  async getLedger(companyId: number, limit: number = 50, offset: number = 0): Promise<LedgerListResponse> {
    return api(apiClient.get<LedgerListResponse>(
      API_ENDPOINTS.COMPANIES.BILLING.LEDGER(companyId),
      { params: { limit, offset } }
    ));
  },

  async getBillingHoldThreads(companyId: number, limit: number = 50, offset: number = 0): Promise<ThreadsResponse> {
    return api(apiClient.get<ThreadsResponse>(
      API_ENDPOINTS.COMPANIES.BILLING.BILLING_HOLD_THREADS(companyId),
      { params: { limit, offset } }
    ));
  },

  async reactivateThread(companyId: number, threadId: string): Promise<ReactivateThreadsResponse> {
    return api(apiClient.post<ReactivateThreadsResponse>(
      API_ENDPOINTS.COMPANIES.BILLING.REACTIVATE_THREAD(companyId, threadId)
    ));
  },

  async reactivateThreads(companyId: number, threadIds: string[]): Promise<ReactivateThreadsResponse> {
    return api(apiClient.post<ReactivateThreadsResponse>(
      API_ENDPOINTS.COMPANIES.BILLING.REACTIVATE_THREADS(companyId),
      { thread_ids: threadIds }
    ));
  },
};
