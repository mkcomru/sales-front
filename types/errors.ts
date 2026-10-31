// Error response types from API

export interface ValidationErrorDetail {
  msg?: string;
  message?: string;
  loc?: Array<string | number>;
  type?: string;
}

export interface ApiErrorResponse {
  detail?: string | ValidationErrorDetail[];
  message?: string;
  code?: string;
}

export interface AxiosErrorResponse {
  response?: {
    status?: number;
    statusText?: string;
    data?: ApiErrorResponse;
  };
  message?: string;
}
