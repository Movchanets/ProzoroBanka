import { useMutation, useQuery } from '@tanstack/react-query';
import { campaignService } from '../../services/campaignService';
import { queryClient } from '../../services/queryClient';
import type { CreateCampaignPayload, UpdateCampaignPayload } from '../../types';

export const campaignKeys = {
  all: (orgId: string) => ['campaigns', orgId] as const,
  detail: (orgId: string, id: string) => ['campaigns', orgId, id] as const,
};

export function useCampaigns(orgId: string | null | undefined) {
  return useQuery({
    queryKey: campaignKeys.all(orgId!),
    queryFn: () => campaignService.list(orgId!),
    enabled: !!orgId,
  });
}

export function useCampaign(orgId: string | null | undefined, id: string | null | undefined) {
  return useQuery({
    queryKey: campaignKeys.detail(orgId!, id!),
    queryFn: () => campaignService.get(orgId!, id!),
    enabled: !!orgId && !!id,
  });
}

export function useCreateCampaign(orgId: string) {
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) =>
      campaignService.create(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
    },
  });
}

export function useUpdateCampaign(orgId: string, id: string) {
  return useMutation({
    mutationFn: (payload: UpdateCampaignPayload) =>
      campaignService.update(orgId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(orgId, id) });
    },
  });
}
