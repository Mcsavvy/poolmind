import { ApiResponse } from '@poolmind/shared-types';

export function createSuccessResponse<T>(
  data: T,
  message?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function createErrorResponse(
  error: string,
  message?: string,
): ApiResponse {
  return {
    success: false,
    error,
    message,
  };
}
