import { useMutation, useQuery } from '@tanstack/react-query';
import { receiptService } from '@/services/receiptService';
import { queryClient } from '@/services/queryClient';
import type {
  ReceiptStatus,
  ReorderReceiptItemPhotosRequest,
  UpdateReceiptOcrDraftRequest,
} from '@/types';

export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  list: (search?: string, status?: ReceiptStatus, onlyUnattached = false) => [
    ...receiptKeys.lists(),
    search ?? '',
    status ?? 'all',
    onlyUnattached ? 'unattached' : 'all',
  ] as const,
  detail: (receiptId: string) => [...receiptKeys.all, 'detail', receiptId] as const,
};

export function useMyReceipts(
  search?: string,
  status?: ReceiptStatus,
  onlyUnattached = false,
  enabled = true,
) {
  return useQuery({
    queryKey: receiptKeys.list(search, status, onlyUnattached),
    queryFn: () => receiptService.list({ search, status, onlyUnattached }),
    enabled,
  });
}

export function useUploadReceiptDraft() {
  return useMutation({
    mutationFn: (file: File) => receiptService.uploadDraft(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
}

export function useUpdateReceiptDraft() {
  return useMutation({
    mutationFn: ({ receiptId, file }: { receiptId: string; file: File }) =>
      receiptService.updateDraft(receiptId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useExtractReceiptData() {
  return useMutation({
    mutationFn: ({
      receiptId,
      organizationId,
      file,
    }: {
      receiptId: string;
      organizationId: string;
      file: File;
    }) => receiptService.extract(receiptId, organizationId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useVerifyReceipt() {
  return useMutation({
    mutationFn: ({
      receiptId,
      organizationId,
    }: {
      receiptId: string;
      organizationId: string;
    }) => receiptService.verify(receiptId, organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useUpdateReceiptOcrDraft() {
  return useMutation({
    mutationFn: ({
      receiptId,
      payload,
    }: {
      receiptId: string;
      payload: UpdateReceiptOcrDraftRequest;
    }) => receiptService.updateOcrDraft(receiptId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useActivateReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.activate(receiptId),
    onSuccess: (_, receiptId) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(receiptId) });
    },
  });
}

export function useRetryReceiptProcessing() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.retry(receiptId),
    onSuccess: (_, receiptId) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(receiptId) });
    },
  });
}

export function useGetMyReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.getById(receiptId),
    onSuccess: (_, receiptId) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(receiptId) });
    },
  });
}

export function useAddReceiptItemPhotos() {
  return useMutation({
    mutationFn: ({ receiptId, files }: { receiptId: string; files: File[] }) =>
      receiptService.addItemPhotos(receiptId, files),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useReplaceReceiptItemPhoto() {
  return useMutation({
    mutationFn: ({ receiptId, photoId, file }: { receiptId: string; photoId: string; file: File }) =>
      receiptService.replaceItemPhoto(receiptId, photoId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useReorderReceiptItemPhotos() {
  return useMutation({
    mutationFn: ({
      receiptId,
      payload,
    }: {
      receiptId: string;
      payload: ReorderReceiptItemPhotosRequest;
    }) => receiptService.reorderItemPhotos(receiptId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}

export function useDeleteReceiptItemPhoto() {
  return useMutation({
    mutationFn: ({ receiptId, photoId }: { receiptId: string; photoId: string }) =>
      receiptService.deleteItemPhoto(receiptId, photoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.receiptId) });
    },
  });
}
