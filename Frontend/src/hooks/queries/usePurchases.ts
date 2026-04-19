import { useMutation, useQuery } from '@tanstack/react-query';
import { purchaseService } from '@/services/purchaseService';
import { queryClient } from '@/services/queryClient';
import type {
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
  UpdateDocumentMetadataRequest,
  PurchaseStatus,
  DocumentType,
} from '@/types';

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  details: () => [...purchaseKeys.all, 'detail'] as const,
  
  list: (organizationId: string, campaignId: string, status?: PurchaseStatus) => [
    ...purchaseKeys.lists(),
    organizationId,
    campaignId,
    status ?? 'all',
  ] as const,
  
  detail: (organizationId: string, campaignId: string, purchaseId: string) => [
    ...purchaseKeys.details(),
    organizationId,
    campaignId,
    purchaseId,
  ] as const,
};

// ── Queries ──

export function usePurchases(
  organizationId: string,
  campaignId: string,
  status?: PurchaseStatus,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseKeys.list(organizationId, campaignId, status),
    queryFn: () => purchaseService.list(organizationId, campaignId, status),
    enabled: enabled && Boolean(organizationId) && Boolean(campaignId),
  });
}

export function usePurchaseDetail(
  organizationId: string,
  campaignId: string,
  purchaseId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseKeys.detail(organizationId, campaignId, purchaseId),
    queryFn: () => purchaseService.getById(organizationId, campaignId, purchaseId),
    enabled: enabled && Boolean(organizationId) && Boolean(campaignId) && Boolean(purchaseId),
  });
}

// ── Purchase Mutations ──

export function useCreatePurchase() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      payload,
    }: {
      organizationId: string;
      campaignId: string;
      payload: CreatePurchaseRequest;
    }) => purchaseService.create(organizationId, campaignId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
    },
  });
}

export function useUpdatePurchase() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      purchaseId,
      payload,
    }: {
      organizationId: string;
      campaignId: string;
      purchaseId: string;
      payload: UpdatePurchaseRequest;
    }) => purchaseService.update(organizationId, campaignId, purchaseId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: purchaseKeys.detail(variables.organizationId, variables.campaignId, variables.purchaseId) 
      });
    },
  });
}

export function useDeletePurchase() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      purchaseId,
    }: {
      organizationId: string;
      campaignId: string;
      purchaseId: string;
    }) => purchaseService.delete(organizationId, campaignId, purchaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
    },
  });
}

// ── Document Mutations ──

export function useUploadPurchaseDocument() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      purchaseId,
      file,
      type,
      documentDate,
      amount,
      counterpartyName,
    }: {
      organizationId: string;
      campaignId: string;
      purchaseId: string;
      file: File;
      type: DocumentType;
      documentDate?: string;
      amount?: number;
      counterpartyName?: string;
    }) => purchaseService.uploadDocument(organizationId, campaignId, purchaseId, file, type, documentDate, amount, counterpartyName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(variables.organizationId, variables.campaignId, variables.purchaseId),
      });
    },
  });
}

export function useUpdatePurchaseDocumentMetadata() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      purchaseId,
      documentId,
      payload,
    }: {
      organizationId: string;
      campaignId: string;
      purchaseId: string;
      documentId: string;
      payload: UpdateDocumentMetadataRequest;
    }) => purchaseService.updateDocumentMetadata(organizationId, campaignId, purchaseId, documentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(variables.organizationId, variables.campaignId, variables.purchaseId),
      });
    },
  });
}

export function useDeletePurchaseDocument() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      purchaseId,
      documentId,
    }: {
      organizationId: string;
      campaignId: string;
      purchaseId: string;
      documentId: string;
    }) => purchaseService.deleteDocument(organizationId, campaignId, purchaseId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(variables.organizationId, variables.campaignId, variables.purchaseId),
      });
    },
  });
}

export function useProcessPurchaseDocumentOcr() {
  return useMutation({
    mutationFn: ({
      organizationId,
      campaignId,
      purchaseId,
      documentId,
    }: {
      organizationId: string;
      campaignId: string;
      purchaseId: string;
      documentId: string;
    }) => purchaseService.processDocumentOcr(organizationId, campaignId, purchaseId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(variables.organizationId, variables.campaignId, variables.purchaseId),
      });
    },
  });
}

// ── Short-route hooks (no campaignId) ──

export const purchaseShortKeys = {
  detail: (organizationId: string, purchaseId: string) =>
    ['purchases', 'shortDetail', organizationId, purchaseId] as const,
};

export function usePurchaseDetailShort(
  organizationId: string,
  purchaseId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseShortKeys.detail(organizationId, purchaseId),
    queryFn: () => purchaseService.getByIdShort(organizationId, purchaseId),
    enabled: enabled && Boolean(organizationId) && Boolean(purchaseId),
  });
}

export function useUpdatePurchaseShort() {
  return useMutation({
    mutationFn: ({
      organizationId,
      purchaseId,
      payload,
    }: {
      organizationId: string;
      purchaseId: string;
      payload: UpdatePurchaseRequest;
    }) => purchaseService.updateShort(organizationId, purchaseId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseShortKeys.detail(variables.organizationId, variables.purchaseId),
      });
    },
  });
}

export function useDeletePurchaseShort() {
  return useMutation({
    mutationFn: ({
      organizationId,
      purchaseId,
    }: {
      organizationId: string;
      purchaseId: string;
    }) => purchaseService.deleteShort(organizationId, purchaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
    },
  });
}

export function useUploadPurchaseDocumentShort() {
  return useMutation({
    mutationFn: ({
      organizationId,
      purchaseId,
      file,
      type,
      documentDate,
      amount,
      counterpartyName,
    }: {
      organizationId: string;
      purchaseId: string;
      file: File;
      type: DocumentType;
      documentDate?: string;
      amount?: number;
      counterpartyName?: string;
    }) => purchaseService.uploadDocumentShort(organizationId, purchaseId, file, type, documentDate, amount, counterpartyName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseShortKeys.detail(variables.organizationId, variables.purchaseId),
      });
    },
  });
}

export function useUpdatePurchaseDocumentMetadataShort() {
  return useMutation({
    mutationFn: ({
      organizationId,
      purchaseId,
      documentId,
      payload,
    }: {
      organizationId: string;
      purchaseId: string;
      documentId: string;
      payload: UpdateDocumentMetadataRequest;
    }) => purchaseService.updateDocumentMetadataShort(organizationId, purchaseId, documentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseShortKeys.detail(variables.organizationId, variables.purchaseId),
      });
    },
  });
}

export function useDeletePurchaseDocumentShort() {
  return useMutation({
    mutationFn: ({
      organizationId,
      purchaseId,
      documentId,
    }: {
      organizationId: string;
      purchaseId: string;
      documentId: string;
    }) => purchaseService.deleteDocumentShort(organizationId, purchaseId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseShortKeys.detail(variables.organizationId, variables.purchaseId),
      });
    },
  });
}

export function useProcessPurchaseDocumentOcrShort() {
  return useMutation({
    mutationFn: ({
      organizationId,
      purchaseId,
      documentId,
    }: {
      organizationId: string;
      purchaseId: string;
      documentId: string;
    }) => purchaseService.processDocumentOcrShort(organizationId, purchaseId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: purchaseShortKeys.detail(variables.organizationId, variables.purchaseId),
      });
    },
  });
}

// ── Public ──

export function usePublicPurchases(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: ['publicPurchases', campaignId],
    queryFn: () => purchaseService.publicList(campaignId),
    enabled: enabled && Boolean(campaignId),
  });
}
