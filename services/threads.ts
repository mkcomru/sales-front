import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { handleApiError } from '../utils/errors';
import {
  getRequestKey,
  getInFlightRequest,
  registerRequest,
  cancelRequestsMatching,
  createAbortController,
} from '../utils/requestManager';
import type {
  ThreadsResponse,
  MessagesResponse,
  CreateMessageRequest,
  ThreadListItem,
  ApiMessage,
} from '../types/api';

export const THREAD_LIST_PAGE_SIZE = 50;
export const THREAD_MESSAGES_PAGE_SIZE = 50;

export const threadsService = {
  async getThreads(
    companyId: number,
    options?: { filter?: string; limit?: number; offset?: number },
  ): Promise<{ items: ThreadListItem[]; total: number }> {
    const params = new URLSearchParams({
      filter: options?.filter || 'all',
      limit: String(options?.limit ?? THREAD_LIST_PAGE_SIZE),
      offset: String(options?.offset ?? 0),
    });
    const url = `${API_ENDPOINTS.COMPANIES.THREADS(companyId)}?${params.toString()}`;
    const key = getRequestKey('GET', url);

    const existing = getInFlightRequest<{ items: ThreadListItem[]; total: number }>(key);
    if (existing) return existing;

    const controller = createAbortController();
    const promise = (async () => {
      try {
        const response = await apiClient.get<ThreadsResponse>(url, { signal: controller.signal });
        const data = response.data;
        const items = data.items ?? [];
        const limit = options?.limit ?? THREAD_LIST_PAGE_SIZE;
        let total = typeof data.total === 'number' ? data.total : items.length;
        if (total < items.length) total = items.length;
        if (typeof data.total !== 'number' && items.length >= limit) {
          total = Math.max(total, items.length + 1);
        }
        return { items, total };
      } catch (error) {
        if ((error as Error).name !== 'CanceledError') handleApiError(error);
        throw error;
      }
    })();

    return registerRequest(key, promise, controller);
  },

  async getThread(
    companyId: number,
    threadId: string,
    options?: { messageLimit?: number; messageOffset?: number },
  ): Promise<{ messages: ApiMessage[]; history_synced?: boolean; metadata?: Record<string, unknown> }> {
    const params = new URLSearchParams();
    if (options?.messageLimit != null) {
      params.set('message_limit', String(options.messageLimit));
    }
    if (options?.messageOffset != null) {
      params.set('message_offset', String(options.messageOffset));
    }
    const q = params.toString();
    const path = API_ENDPOINTS.THREADS.BY_ID(companyId, threadId);
    const url = q ? `${path}?${q}` : path;
    const data = await api(
      apiClient.get<{
        messages: ApiMessage[];
        history_synced?: boolean;
        metadata?: Record<string, unknown>;
      }>(url),
    );
    const messages = (data.messages || []).sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    );
    return { messages, history_synced: data.history_synced, metadata: data.metadata };
  },

  async syncHistory(
    companyId: number,
    threadId: string,
    options: { messageLimit?: number; offset?: number } = {},
  ): Promise<{ status: string }> {
    const params = new URLSearchParams();
    if (options.messageLimit != null) params.set('message_limit', String(options.messageLimit));
    if (options.offset != null && options.offset > 0) params.set('offset', String(options.offset));
    const qs = params.toString();
    const url = qs
      ? `${API_ENDPOINTS.THREADS.SYNC_HISTORY(companyId, threadId)}?${qs}`
      : API_ENDPOINTS.THREADS.SYNC_HISTORY(companyId, threadId);
    return api(apiClient.post<{ status: string }>(url));
  },

  async getMessages(
    companyId: number,
    threadId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: ApiMessage[]; total: number }> {
    const params = new URLSearchParams();
    params.set('limit', String(options?.limit ?? THREAD_MESSAGES_PAGE_SIZE));
    params.set('offset', String(options?.offset ?? 0));
    const path = API_ENDPOINTS.THREADS.MESSAGES(companyId, threadId);
    const url = `${path}?${params.toString()}`;
    const key = getRequestKey('GET', url);

    const existing = getInFlightRequest<{ items: ApiMessage[]; total: number }>(key);
    if (existing) return existing;

    const controller = createAbortController();
    const promise = (async () => {
      try {
        const response = await apiClient.get<MessagesResponse>(url, { signal: controller.signal });
        const data = response.data;
        const rawItems = data.items || [];
        const items = rawItems.sort(
          (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
        );
        const limit = options?.limit ?? THREAD_MESSAGES_PAGE_SIZE;
        let total = typeof data.total === 'number' ? data.total : items.length;
        if (total < items.length) total = items.length;
        if (typeof data.total !== 'number' && items.length >= limit) {
          total = Math.max(total, items.length + 1);
        }
        return { items, total };
      } catch (error) {
        if ((error as Error).name !== 'CanceledError') handleApiError(error);
        throw error;
      }
    })();

    return registerRequest(key, promise, controller);
  },

  cancelMessages(companyId: number, threadId: string): number {
    const path = API_ENDPOINTS.THREADS.MESSAGES(companyId, threadId);
    return cancelRequestsMatching(path);
  },

  async sendMessage(companyId: number, threadId: string, payload: CreateMessageRequest): Promise<{ message_id: string }> {
    return api(apiClient.post<{ message_id: string }>(
      API_ENDPOINTS.THREADS.MESSAGES(companyId, threadId),
      payload,
    ));
  },

  async stopAssistant(companyId: number, threadId: string): Promise<void> {
    await api(apiClient.post(API_ENDPOINTS.THREADS.CONTROL.STOP_ASSISTANT(companyId, threadId)));
  },

  async resumeAssistant(companyId: number, threadId: string): Promise<void> {
    await api(apiClient.post(API_ENDPOINTS.THREADS.CONTROL.RESUME_ASSISTANT(companyId, threadId)));
  },
};
