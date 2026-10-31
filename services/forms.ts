import axios from 'axios';
import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { API_BASE_URL } from '../config/env';
import type {
  FormTemplate,
  FormTemplateCreate,
  FormTemplatePatch,
  FormSubmission,
  RegenerateKeyResponse,
  PaginatedResponse,
  PublicFormResponse,
  CaptureSubmitRequest,
  CaptureSubmitResponse,
} from '../types/api';

export const formsService = {
  async list(companyId: number): Promise<FormTemplate[]> {
    const data = await api(apiClient.get<PaginatedResponse<FormTemplate>>(API_ENDPOINTS.FORMS.LIST(companyId)));
    return data.items;
  },

  async get(companyId: number, formId: number): Promise<FormTemplate> {
    return api(apiClient.get<FormTemplate>(API_ENDPOINTS.FORMS.BY_ID(companyId, formId)));
  },

  async create(companyId: number, data: FormTemplateCreate): Promise<FormTemplate> {
    return api(apiClient.post<FormTemplate>(API_ENDPOINTS.FORMS.CREATE(companyId), data));
  },

  async update(companyId: number, formId: number, data: FormTemplatePatch): Promise<FormTemplate> {
    return api(apiClient.patch<FormTemplate>(API_ENDPOINTS.FORMS.UPDATE(companyId, formId), data));
  },

  async delete(companyId: number, formId: number): Promise<void> {
    await api(apiClient.delete(API_ENDPOINTS.FORMS.DELETE(companyId, formId)));
  },

  async regenerateKey(companyId: number, formId: number): Promise<string> {
    const data = await api(apiClient.post<RegenerateKeyResponse>(API_ENDPOINTS.FORMS.REGENERATE_KEY(companyId, formId)));
    return data.api_key;
  },

  async listSubmissions(
    companyId: number,
    formId: number,
    limit = 20,
    offset = 0
  ): Promise<{ items: FormSubmission[]; total: number }> {
    const data = await api(apiClient.get<PaginatedResponse<FormSubmission>>(
      API_ENDPOINTS.FORMS.SUBMISSIONS(companyId, formId),
      { params: { limit, offset } }
    ));
    return { items: data.items, total: data.total ?? 0 };
  },

  async getPublicForm(publicId: string): Promise<PublicFormResponse> {
    const baseUrl = API_BASE_URL || '';
    const response = await axios.get<PublicFormResponse>(
      `${baseUrl}${API_ENDPOINTS.FORMS.PUBLIC_GET(publicId)}`
    );
    return response.data;
  },

  async submitPublicForm(publicId: string, data: CaptureSubmitRequest): Promise<CaptureSubmitResponse> {
    const baseUrl = API_BASE_URL || '';
    const response = await axios.post<CaptureSubmitResponse>(
      `${baseUrl}${API_ENDPOINTS.FORMS.PUBLIC_SUBMIT(publicId)}`,
      data
    );
    return response.data;
  },
};
