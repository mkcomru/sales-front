import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { logger } from '../utils/logger';
import type { Customer, UpdateCustomerRequest } from '../types/api';

export const customersService = {
  async getCustomer(companyId: number, customerId: string): Promise<Customer> {
    return api(apiClient.get<Customer>(API_ENDPOINTS.CUSTOMERS.BY_ID(companyId, customerId)));
  },

  async updateCustomer(companyId: number, customerId: string, data: UpdateCustomerRequest): Promise<Customer> {
    return api(apiClient.patch<Customer>(API_ENDPOINTS.CUSTOMERS.BY_ID(companyId, customerId), data));
  },

  async updateFields(
    companyId: number,
    customerId: string,
    fields: Record<string, string | number | boolean | null>
  ): Promise<void> {
    const url = API_ENDPOINTS.CUSTOMERS.FIELDS(companyId, customerId);
    logger.debug('PATCH customer fields', { url, companyId, customerId, keys: Object.keys(fields) });
    await api(apiClient.patch(url, { answers: fields }));
  },
};
