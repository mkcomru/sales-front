import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { TaskResponse, CreateOrderTaskRequest, UpdateTaskRequest, PaginatedResponse } from '../types/api';

export type ListTasksOptions = {
  includeCompleted?: boolean;
};

export const tasksService = {
  async listForOrder(companyId: number, orderId: number, options?: ListTasksOptions): Promise<TaskResponse[]> {
    const data = await api(apiClient.get<PaginatedResponse<TaskResponse>>(
      API_ENDPOINTS.TASKS.ORDER_TASKS(companyId, orderId),
      { params: options?.includeCompleted === true ? { include_completed: true } : undefined }
    ));
    return data.items;
  },

  async getById(companyId: number, orderId: number, taskId: number): Promise<TaskResponse> {
    return api(apiClient.get<TaskResponse>(API_ENDPOINTS.TASKS.TASK_BY_ID(companyId, orderId, taskId)));
  },

  async create(companyId: number, orderId: number, data: CreateOrderTaskRequest): Promise<TaskResponse> {
    return api(apiClient.post<TaskResponse>(API_ENDPOINTS.TASKS.ORDER_TASKS(companyId, orderId), data));
  },

  async update(companyId: number, orderId: number, taskId: number, data: UpdateTaskRequest): Promise<TaskResponse> {
    return api(apiClient.patch<TaskResponse>(API_ENDPOINTS.TASKS.TASK_BY_ID(companyId, orderId, taskId), data));
  },

  async complete(companyId: number, orderId: number, taskId: number): Promise<void> {
    await api(apiClient.post(API_ENDPOINTS.TASKS.COMPLETE(companyId, orderId, taskId)));
  },

  async cancel(companyId: number, orderId: number, taskId: number): Promise<void> {
    await api(apiClient.post(API_ENDPOINTS.TASKS.CANCEL(companyId, orderId, taskId)));
  },

  async myTasks(companyId: number, options?: ListTasksOptions): Promise<TaskResponse[]> {
    const data = await api(apiClient.get<PaginatedResponse<TaskResponse>>(
      API_ENDPOINTS.TASKS.MY_TASKS(companyId),
      { params: options?.includeCompleted === true ? { include_completed: true } : undefined }
    ));
    return data.items;
  },

  async allCompanyTasks(companyId: number, options?: ListTasksOptions): Promise<TaskResponse[]> {
    const data = await api(apiClient.get<PaginatedResponse<TaskResponse>>(
      API_ENDPOINTS.TASKS.ALL_COMPANY_TASKS(companyId),
      { params: options?.includeCompleted === true ? { include_completed: true } : undefined }
    ));
    return data.items;
  },
};
