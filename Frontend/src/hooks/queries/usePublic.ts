import { useQuery } from '@tanstack/react-query';
import { CampaignStatus, type CampaignStatus as CampaignStatusType } from '@/types';
import { publicService } from '@/services/publicService';
import type { PublicListResponse, PublicReceipt } from '@/types';

type HomeCampaignStatusFilter = 'all' | 'active' | 'completed';

function mapHomeStatusToCampaignStatus(status: HomeCampaignStatusFilter): CampaignStatusType | undefined {
  if (status === 'active') return CampaignStatus.Active;
  if (status === 'completed') return CampaignStatus.Completed;
  return undefined;
}

export const publicKeys = {
  all: ['public'] as const,
  organizations: (
    query: string,
    page: number,
    verifiedOnly: boolean,
    activeOnly: boolean,
    sortBy: 'verified' | 'totalRaised' | 'activeCampaigns' | undefined,
    pageSize: number,
  ) => [...publicKeys.all, 'organizations', query, page, verifiedOnly, activeOnly, sortBy, pageSize] as const,
  campaignSearch: (query: string, status: HomeCampaignStatusFilter, verifiedOnly: boolean, pageSize: number) =>
    [...publicKeys.all, 'campaignSearch', query, status, verifiedOnly, pageSize] as const,
  organization: (slug: string) => [...publicKeys.all, 'organization', slug] as const,
  orgCampaigns: (slug: string, status: CampaignStatus | undefined, page: number) =>
    [...publicKeys.all, 'orgCampaigns', slug, status, page] as const,
  campaign: (campaignId: string) => [...publicKeys.all, 'campaign', campaignId] as const,
  campaignReceipts: (campaignId: string, page: number) =>
    [...publicKeys.all, 'campaignReceipts', campaignId, page] as const,
  receipt: (receiptId: string) => [...publicKeys.all, 'receipt', receiptId] as const,
  transparency: (slug: string) => [...publicKeys.all, 'transparency', slug] as const,
};

const publicQueryDefaults = {
  staleTime: 60_000,
  retry: 1,
} as const;

export function useSearchOrganizations(
  query: string,
  page: number,
  verifiedOnly: boolean,
  activeOnly: boolean,
  sortBy?: 'verified' | 'totalRaised' | 'activeCampaigns',
  pageSize = 12,
  enabled = true,
) {
  return useQuery({
    queryKey: publicKeys.organizations(query, page, verifiedOnly, activeOnly, sortBy, pageSize),
    queryFn: () => publicService.searchOrganizations(query, page, verifiedOnly, activeOnly, sortBy, pageSize),
    enabled,
    ...publicQueryDefaults,
  });
}

export function useHomeCampaignFeed(
  query: string,
  status: HomeCampaignStatusFilter,
  verifiedOnly: boolean,
  pageSize = 24,
  enabled = true,
) {
  return useQuery({
    queryKey: publicKeys.campaignSearch(query, status, verifiedOnly, pageSize),
    queryFn: async () => {
      const response = await publicService.searchCampaigns(
        query,
        mapHomeStatusToCampaignStatus(status),
        verifiedOnly,
        1,
        pageSize,
      );

      return response.items;
    },
    enabled,
    ...publicQueryDefaults,
  });
}

export function usePublicOrganization(slug: string | null | undefined) {
  return useQuery({
    queryKey: publicKeys.organization(slug ?? ''),
    queryFn: () => publicService.getOrganization(slug ?? ''),
    enabled: Boolean(slug),
    ...publicQueryDefaults,
  });
}

export function usePublicOrgCampaigns(slug: string | null | undefined, status?: CampaignStatus, page = 1) {
  return useQuery({
    queryKey: publicKeys.orgCampaigns(slug ?? '', status, page),
    queryFn: () => publicService.getOrganizationCampaigns(slug ?? '', status, page),
    enabled: Boolean(slug),
    ...publicQueryDefaults,
  });
}

export function usePublicCampaign(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: publicKeys.campaign(campaignId ?? ''),
    queryFn: () => publicService.getCampaign(campaignId ?? ''),
    enabled: Boolean(campaignId),
    ...publicQueryDefaults,
  });
}

export function usePublicCampaignReceipts(campaignId: string | null | undefined, page = 1) {
  return useQuery({
    queryKey: publicKeys.campaignReceipts(campaignId ?? '', page),
    queryFn: async (): Promise<PublicListResponse<PublicReceipt>> => {
      const firstPage = await publicService.getCampaignReceipts(campaignId ?? '', page, 50);
      if (firstPage.items.length >= firstPage.totalCount) {
        return firstPage;
      }

      const totalPages = Math.ceil(firstPage.totalCount / firstPage.pageSize);
      const remainingPages = Array.from({ length: Math.max(0, totalPages - page) }, (_, index) => page + index + 1);
      const nextPages = await Promise.all(
        remainingPages.map((pageNumber) => publicService.getCampaignReceipts(campaignId ?? '', pageNumber, firstPage.pageSize)),
      );

      return {
        ...firstPage,
        items: [
          ...firstPage.items,
          ...nextPages.flatMap((response) => response.items),
        ],
      };
    },
    enabled: Boolean(campaignId),
    ...publicQueryDefaults,
  });
}

export function usePublicReceipt(receiptId: string | null | undefined) {
  return useQuery({
    queryKey: publicKeys.receipt(receiptId ?? ''),
    queryFn: () => publicService.getReceipt(receiptId ?? ''),
    enabled: Boolean(receiptId),
    ...publicQueryDefaults,
  });
}

export function useOrgTransparency(slug: string | null | undefined) {
  return useQuery({
    queryKey: publicKeys.transparency(slug ?? ''),
    queryFn: () => publicService.getOrganizationTransparency(slug ?? ''),
    enabled: Boolean(slug),
    ...publicQueryDefaults,
  });
}
