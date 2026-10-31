import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type {
  NotificationListResponse,
  NotificationRecipientResponse,
  CompanyNotificationSummary,
} from '../types/api';

export const notificationsService = {
  getList(
    companyId: number,
    params?: { limit?: number; offset?: number; unread_only?: boolean },
  ): Promise<NotificationListResponse> {
    return apiClient
      .get<NotificationListResponse>(API_ENDPOINTS.NOTIFICATIONS.LIST(companyId), { params })
      .then((r) => r.data);
  },

  getUnreadCount(companyId: number): Promise<number> {
    return apiClient
      .get<{ count: number }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT(companyId))
      .then((r) => r.data.count);
  },

  markRead(companyId: number, recipientId: number): Promise<NotificationRecipientResponse> {
    return apiClient
      .post<NotificationRecipientResponse>(
        API_ENDPOINTS.NOTIFICATIONS.READ(companyId, recipientId),
      )
      .then((r) => r.data);
  },

  markAllRead(companyId: number): Promise<{ updated: number }> {
    return apiClient
      .post<{ updated: number }>(API_ENDPOINTS.NOTIFICATIONS.READ_ALL(companyId))
      .then((r) => r.data);
  },

  getSummary(): Promise<CompanyNotificationSummary[]> {
    return apiClient
      .get<CompanyNotificationSummary[]>(API_ENDPOINTS.NOTIFICATIONS.SUMMARY)
      .then((r) => r.data);
  },
};
