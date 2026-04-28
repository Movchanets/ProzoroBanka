import { queryClient } from '@/services/queryClient';
import type { FetchQueryOptions } from '@tanstack/react-query';
import type { ServiceResponse } from '@/types';

/**
 * Ensures query data is available in the cache, fetching if necessary.
 * Useful for clientLoaders to prefetch data into TanStack Query cache.
 */
export async function ensureQueryData<T>(options: FetchQueryOptions<T>) {
  return await queryClient.ensureQueryData(options);
}

/**
 * Maps a ServiceResponse failure or a caught Error into a standard action data format for clientActions.
 */
export function mapActionError(error: unknown) {
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }
  
  const response = error as ServiceResponse<any>;
  if (response && typeof response === 'object' && 'success' in response && response.success === false) {
    return {
      success: false,
      error: response.message || 'An unexpected error occurred',
    };
  }

  return {
    success: false,
    error: typeof error === 'string' ? error : 'An unexpected error occurred',
  };
}
