import { useMutation, useQuery } from '@tanstack/react-query';
import { campaignService } from '../../services/campaignService';
import { queryClient } from '../../services/queryClient';
import type { 
  CampaignStatus, 
  ChangeCampaignStatusPayload, 
  CreateCampaignPayload, 
  UpdateCampaignPayload 
} from '../../types';

export const campaignKeys = {
  all: (orgId: string) => ['campaigns', orgId] as const,
  detail: (id: string) => ['campaign', id] as const,
  stats: (orgId: string) => ['campaignStats', orgId] as const,
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
