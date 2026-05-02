import { useMutation, useQuery } from '@tanstack/react-query';
import { receiptService } from '@/services/receiptService';
import { queryClient } from '@/services/queryClient';
import type {
  AddReceiptItemRequest,
  LinkReceiptItemPhotoRequest,
  ReceiptStatus,
  ReorderReceiptItemPhotosRequest,
  UpdateReceiptItemRequest,
  UpdateReceiptOcrDraftRequest,
} from '@/types';

export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  details: () => [...receiptKeys.all, 'detail'] as const,
  list: (organizationId: string, search?: string, status?: ReceiptStatus, onlyUnattached = false) => [
    ...receiptKeys.lists(),
    organizationId,
    search ?? '',
    status ?? 'all',
    onlyUnattached ? 'unattached' : 'all',
  ] as const,
  detail: (organizationId: string, receiptId: string) => [...receiptKeys.details(), organizationId, receiptId] as const,
};

export function useMyReceipts(
  organizationId: string,
  search?: string,
  status?: ReceiptStatus,
  onlyUnattached = false,
  enabled = true,
  refetchInterval?: number | false | ((query: any) => number | false),
) {
  return useQuery({
    queryKey: receiptKeys.list(organizationId, search, status, onlyUnattached),
    queryFn: () => receiptService.listByOrganization(organizationId, { search, status, onlyUnattached }),
    enabled: enabled && Boolean(organizationId),
    refetchInterval,
  });
}

export function useUploadReceiptDraft() {
  return useMutation({
    mutationFn: ({ organizationId, file }: { organizationId: string; file: File }) =>
      receiptService.uploadOrganizationDraft(organizationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
}

export function useUpdateReceiptDraft() {
  return useMutation({
    mutationFn: ({ receiptId, file }: { receiptId: string; file: File }) =>
      receiptService.updateDraft(receiptId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useExtractReceiptData() {
  return useMutation({
    mutationFn: ({
      receiptId,
      organizationId,
      file,
      modelIdentifier,
    }: {
      receiptId: string;
      organizationId: string;
      file?: File;
      modelIdentifier?: string;
    }) => receiptService.extract(receiptId, organizationId, file, modelIdentifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useActivateReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.activate(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useRetryReceiptProcessing() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.retry(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useDeleteReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptService.delete(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useReceiptDetail(
  organizationId: string,
  receiptId: string,
  enabled = true,
  refetchInterval?: number | false | ((query: any) => number | false),
) {
  return useQuery({
    ...getReceiptDetailOptions(organizationId, receiptId),
    enabled: enabled && Boolean(organizationId) && Boolean(receiptId),
    refetchInterval,
  });
}

export const getReceiptDetailOptions = (organizationId: string, receiptId: string) => ({
  queryKey: receiptKeys.detail(organizationId, receiptId),
  queryFn: () => receiptService.getByIdInOrganization(organizationId, receiptId),
});

export function useGetMyReceipt() {
  return useMutation({
    mutationFn: ({ organizationId, receiptId }: { organizationId: string; receiptId: string }) =>
      receiptService.getByIdInOrganization(organizationId, receiptId),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(receiptKeys.detail(variables.organizationId, variables.receiptId), data);
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(variables.organizationId, variables.receiptId) });
    },
  });
}

export function useAddReceiptItemPhotos() {
  return useMutation({
    mutationFn: ({ receiptId, files }: { receiptId: string; files: File[] }) =>
      receiptService.addItemPhotos(receiptId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useReplaceReceiptItemPhoto() {
  return useMutation({
    mutationFn: ({ receiptId, photoId, file }: { receiptId: string; photoId: string; file: File }) =>
      receiptService.replaceItemPhoto(receiptId, photoId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useDeleteReceiptItemPhoto() {
  return useMutation({
    mutationFn: ({ receiptId, photoId }: { receiptId: string; photoId: string }) =>
      receiptService.deleteItemPhoto(receiptId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useLinkReceiptItemPhoto() {
  return useMutation({
    mutationFn: ({
      receiptId,
      photoId,
      payload,
    }: {
      receiptId: string;
      photoId: string;
      payload: LinkReceiptItemPhotoRequest;
    }) => receiptService.linkItemPhoto(receiptId, photoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useAddReceiptItem() {
  return useMutation({
    mutationFn: ({
      receiptId,
      payload,
    }: {
      receiptId: string;
      payload: AddReceiptItemRequest;
    }) => receiptService.addItem(receiptId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useUpdateReceiptItem() {
  return useMutation({
    mutationFn: ({
      receiptId,
      itemId,
      payload,
    }: {
      receiptId: string;
      itemId: string;
      payload: UpdateReceiptItemRequest;
    }) => receiptService.updateItem(receiptId, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useDeleteReceiptItem() {
  return useMutation({
    mutationFn: ({ receiptId, itemId }: { receiptId: string; itemId: string }) =>
      receiptService.deleteItem(receiptId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export function useImportReceiptTaxXml() {
  return useMutation({
    mutationFn: ({ receiptId, file }: { receiptId: string; file: File }) =>
      receiptService.importTaxXml(receiptId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.details() });
    },
  });
}

export const getMyReceiptsOptions = (
  organizationId: string,
  params?: { search?: string; status?: ReceiptStatus; onlyUnattached?: boolean },
) => ({
  queryKey: receiptKeys.list(
    organizationId,
    params?.search,
    params?.status,
    params?.onlyUnattached,
  ),
  queryFn: () => receiptService.listByOrganization(organizationId, params),
});
