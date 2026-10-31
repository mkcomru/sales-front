import { api, apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type { CompanyMetricsSnapshotsPage } from '../types/api';

export const companyMetricsService = {
  listSnapshots(
    companyId: number,
    params?: { limit?: number; offset?: number },
  ): Promise<CompanyMetricsSnapshotsPage> {
    return api(
      apiClient.get<CompanyMetricsSnapshotsPage>(
        API_ENDPOINTS.COMPANIES.COMPANY_METRICS_SNAPSHOTS(companyId),
        {
          params: {
            limit: params?.limit ?? 50,
            offset: params?.offset ?? 0,
          },
        },
      ),
    );
  },
};
