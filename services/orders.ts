import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { OrderResponse, OrderLogEntry, PaginatedResponse, OrderStageRequirementsResponse } from '../types/api';
import { ApiException } from '../utils/errors';

export const ordersService = {
  async list(companyId: number, params?: { limit?: number; offset?: number; stage_id?: number }): Promise<OrderResponse[]> {
    return api(apiClient.get<OrderResponse[]>(API_ENDPOINTS.ORDERS.LIST(companyId), { params }));
  },

  async getById(companyId: number, orderId: number): Promise<OrderResponse> {
    return api(apiClient.get<OrderResponse>(API_ENDPOINTS.ORDERS.BY_ID(companyId, orderId)));
  },

  async update(
    companyId: number,
    orderId: number,
    data: {
      stage_id?: number | null;
      name?: string;
      order_fields?: Record<string, unknown>;
      extra_fields?: Record<string, string | number | boolean | null>;
    }
  ): Promise<OrderResponse> {
    return api(apiClient.patch<OrderResponse>(API_ENDPOINTS.ORDERS.BY_ID(companyId, orderId), data));
  },

  async updateFields(
    companyId: number,
    orderId: number,
    fields: Record<string, string | number | boolean | null>
  ): Promise<OrderResponse> {
    return this.update(companyId, orderId, { order_fields: fields });
  },

  async updateExtraFields(
    companyId: number,
    orderId: number,
    fields: Record<string, string | number | boolean | null>
  ): Promise<OrderResponse> {
    return this.update(companyId, orderId, { extra_fields: fields });
  },

  async updateAssignee(companyId: number, orderId: number, assigneeId: number | null): Promise<void> {
    await api(apiClient.put(API_ENDPOINTS.ORDERS.ASSIGNEE(companyId, orderId), { assignee_id: assigneeId }));
  },

  async close(companyId: number, orderId: number, result: 'won' | 'lost'): Promise<void> {
    await api(apiClient.post(API_ENDPOINTS.ORDERS.CLOSE(companyId, orderId), { result }));
  },

  async updateFrozen(companyId: number, orderId: number, frozen: boolean): Promise<void> {
    await api(apiClient.patch(API_ENDPOINTS.ORDERS.FROZEN(companyId, orderId), { frozen }));
  },

  async getLogs(companyId: number, orderId: number): Promise<OrderLogEntry[]> {
    const data = await api(
      apiClient.get<OrderLogEntry[] | PaginatedResponse<OrderLogEntry>>(API_ENDPOINTS.ORDERS.LOGS(companyId, orderId))
    );
    if (Array.isArray(data)) {
      return data;
    }
    if (!Array.isArray(data.items)) {
      throw new ApiException('Invalid order logs response: expected array or paginated items');
    }
    return data.items;
  },

  async addComment(companyId: number, orderId: number, comment: string): Promise<void> {
    await api(apiClient.post(API_ENDPOINTS.ORDERS.LOGS(companyId, orderId), { action: 'comment', details: { comment } }));
  },

  async getStageRequirements(companyId: number, orderId: number): Promise<OrderStageRequirementsResponse> {
    return api(apiClient.post<OrderStageRequirementsResponse>(API_ENDPOINTS.ORDERS.STAGE_REQUIREMENTS(companyId, orderId)));
  },

  async getCustomerOrders(companyId: number, customerId: number): Promise<OrderResponse[]> {
    const data = await api(apiClient.get<OrderResponse[] | PaginatedResponse<OrderResponse>>(
      API_ENDPOINTS.ORDERS.CUSTOMER_ORDERS(companyId, customerId)
    ));
    return Array.isArray(data) ? data : data.items;
  },
};
