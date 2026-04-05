import { useMutation } from '@tanstack/react-query';
import { receiptService } from '@/services/receiptService';
import type { UpdateReceiptOcrDraftRequest } from '@/types';

export function useUploadReceiptDraft() {
  return useMutation({
    mutationFn: (file: File) => receiptService.uploadDraft(file),
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
  });
}

export function useActivateReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.activate(receiptId),
  });
}

export function useRetryReceiptProcessing() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.retry(receiptId),
  });
}

export function useGetMyReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.getById(receiptId),
  });
}
