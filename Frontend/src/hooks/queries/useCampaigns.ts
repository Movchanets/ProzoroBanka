import { useMutation, useQuery } from '@tanstack/react-query';
import { campaignService } from '../../services/campaignService';
import { queryClient } from '../../services/queryClient';
import { receiptKeys } from './useReceipts';
import type { 
  CampaignStatus, 
  ChangeCampaignStatusPayload, 
  CreateCampaignPayload, 
  UpdateCampaignBalancePayload,
  UpdateCampaignPayload 
} from '../../types';

export const campaignKeys = {
  all: (orgId: string) => ['campaigns', orgId] as const,
  detail: (id: string) => ['campaign', id] as const,
  stats: (orgId: string) => ['campaignStats', orgId] as const,
  transactions: (id: string, page: number, pageSize: number) => ['campaignTransactions', id, page, pageSize] as const,
  receipts: (id: string) => ['campaignReceipts', id] as const,
};

export function useCampaigns(orgId: string | null | undefined, status?: CampaignStatus) {
  return useQuery({
    queryKey: [...campaignKeys.all(orgId!), status],
    queryFn: () => campaignService.listByOrganization(orgId!, status),
    enabled: !!orgId,
  });
}

export function useCampaign(id: string | null | undefined) {
  return useQuery({
    queryKey: campaignKeys.detail(id!),
    queryFn: () => campaignService.getDetails(id!),
    enabled: !!id,
  });
}

export function useCampaignStats(orgId: string | null | undefined) {
  return useQuery({
    queryKey: campaignKeys.stats(orgId!),
    queryFn: () => campaignService.getStats(orgId!),
    enabled: !!orgId,
  });
}

export function useCampaignTransactions(
  campaignId: string | null | undefined,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: campaignKeys.transactions(campaignId!, page, pageSize),
    queryFn: () => campaignService.getTransactions(campaignId!, page, pageSize),
    enabled: !!campaignId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCampaignReceipts(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: campaignKeys.receipts(campaignId!),
    queryFn: () => campaignService.getReceipts(campaignId!),
    enabled: !!campaignId,
  });
}

export function useCreateCampaign(orgId: string) {
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) =>
      campaignService.create(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.stats(orgId) });
    },
  });
}

export function useUpdateCampaign(orgId: string) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCampaignPayload }) =>
      campaignService.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
    },
  });
}

export function useChangeCampaignStatus(orgId: string) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangeCampaignStatusPayload }) =>
      campaignService.changeStatus(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.stats(orgId) });
    },
  });
}

export function useUploadCampaignCover(orgId: string) {
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      campaignService.uploadCover(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
    },
  });
}

export function useDeleteCampaign(orgId: string) {
  return useMutation({
    mutationFn: (id: string) => campaignService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.stats(orgId) });
    },
  });
}

export function useGetMonobankJars() {
  return useMutation({
    mutationFn: (token: string) => campaignService.getMonobankJars(token),
  });
}

export function useSetupMonobankWebhook(orgId: string) {
  return useMutation({
    mutationFn: campaignService.setupMonobankWebhook,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
    },
  });
}

export function useUpdateCampaignBalance(orgId: string) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCampaignBalancePayload }) =>
      campaignService.updateBalanceManual(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.stats(orgId) });
      queryClient.invalidateQueries({ queryKey: ['campaignTransactions', variables.id] });
    },
  });
}

export function useAttachReceiptToCampaign(orgId: string) {
  return useMutation({
    mutationFn: ({ campaignId, receiptId }: { campaignId: string; receiptId: string }) =>
      campaignService.attachReceipt(campaignId, receiptId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.stats(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.receipts(variables.campaignId) });
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
}

export function useCampaignPhotos(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: [...campaignKeys.detail(campaignId!), 'photos'],
    queryFn: () => campaignService.getPhotos(campaignId!),
    enabled: !!campaignId,
  });
}

export function useAddCampaignPhoto(campaignId: string) {
  return useMutation({
    mutationFn: ({ file, description }: { file: File; description?: string }) =>
      campaignService.addPhoto(campaignId, file, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...campaignKeys.detail(campaignId), 'photos'] });
    },
  });
}

export function useDeleteCampaignPhoto(campaignId: string) {
  return useMutation({
    mutationFn: (photoId: string) => campaignService.deletePhoto(campaignId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...campaignKeys.detail(campaignId), 'photos'] });
    },
  });
}

export function useReorderCampaignPhotos(campaignId: string) {
  return useMutation({
    mutationFn: (payload: { photoIds: string[] }) =>
      campaignService.reorderPhotos(campaignId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...campaignKeys.detail(campaignId), 'photos'] });
    },
  });
}

export function useUpdateCampaignPhoto(campaignId: string) {
  return useMutation({
    mutationFn: ({ photoId, payload }: { photoId: string; payload: { description?: string } }) =>
      campaignService.updatePhoto(campaignId, photoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...campaignKeys.detail(campaignId), 'photos'] });
    },
  });
}
