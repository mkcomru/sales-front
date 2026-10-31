import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { ProductsResponse, ProductRequest, ProductBackend, CategoryBackend } from '../types/api';

export const productsService = {
  async getCompanyProducts(companyId: number): Promise<ProductsResponse> {
    return api(apiClient.get<ProductsResponse>(
      `${API_ENDPOINTS.COMPANIES.PRODUCTS(companyId)}?_t=${Date.now()}`
    ));
  },

  async createProduct(data: ProductRequest): Promise<ProductBackend> {
    return api(apiClient.post<ProductBackend>(API_ENDPOINTS.PRODUCTS.CREATE, data));
  },

  async updateProduct(id: number, data: Partial<ProductRequest>): Promise<ProductBackend> {
    return api(apiClient.patch<ProductBackend>(API_ENDPOINTS.PRODUCTS.UPDATE(id), data));
  },

  async deleteProduct(id: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.PRODUCTS.DELETE(id)));
  },

  async createCategory(companyId: number, data: { name: string; description?: string; rules?: string; workflow?: string }): Promise<CategoryBackend> {
    return api(apiClient.post<CategoryBackend>(
      API_ENDPOINTS.CATEGORIES.CREATE(companyId),
      { ...data, company_id: companyId }
    ));
  },

  async updateCategory(companyId: number, categoryId: number, data: { name?: string; description?: string; rules?: string; workflow?: string }): Promise<CategoryBackend> {
    return api(apiClient.patch<CategoryBackend>(API_ENDPOINTS.CATEGORIES.UPDATE(companyId, categoryId), data));
  },

  async deleteCategory(companyId: number, categoryId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.CATEGORIES.DELETE(companyId, categoryId)));
  },
};
