import { AxiosError } from 'axios';
import { ApiError } from '../types/api';

export class ApiException extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export class NetworkException extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkException';
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedException';
  }
}

export class NotFoundException extends ApiException {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundException';
  }
}

export function handleApiError(error: unknown): never {
  if (error instanceof ApiException) {
    throw error;
  }

  if (error instanceof AxiosError) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as ApiError | undefined;

      switch (status) {
        case 401:
          throw new UnauthorizedException(data?.message || 'Unauthorized');
        case 404:
          throw new NotFoundException(data?.message || 'Resource not found');
        default:
          throw new ApiException(
            data?.message || error.message || 'API error occurred',
            status,
            data?.code,
            data?.details
          );
      }
    } else if (error.request) {
      // Request made but no response received
      throw new NetworkException('No response from server');
    } else {
      // Error setting up request
      throw new NetworkException(error.message || 'Network error occurred');
    }
  }

  // Unknown error
  throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
}

/**
 * Extract a human-readable error message from an API error response.
 * Handles FastAPI 422 validation errors (detail as array), string detail, and message field.
 */
export function extractApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data;
    const detail = data.detail;
    const message = data.message;

    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string; message?: string; loc?: string[] }) => {
          const field = d.loc?.slice(-1)[0];
          const msg = d.msg || d.message || '';
          return field ? `${field}: ${msg}` : msg;
        })
        .filter(Boolean)
        .join('; ');
    }
    if (typeof message === 'string') return message;
  }

  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка';
}
