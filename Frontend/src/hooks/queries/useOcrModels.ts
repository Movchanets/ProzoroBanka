import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import type { OcrModelConfig } from '@/types';

export const ocrModelQueryKeys = {
  active: () => ['ocr-models', 'active'] as const,
};

export function useOcrModels(enabled = true) {
  return useQuery({
    ...getOcrModelsOptions(),
    enabled,
  });
}

export const getOcrModelsOptions = () => ({
  queryKey: ocrModelQueryKeys.active(),
  queryFn: () => apiFetch<OcrModelConfig[]>('/api/ocr/models'),
});
