import { useQuery } from '@tanstack/react-query';
import { CampaignStatus, type CampaignStatus as CampaignStatusType } from '@/types';
import { publicService } from '@/services/publicService';
import type { PublicListResponse, PublicReceipt, PublicCampaignDetail, PublicOrganization, PublicReceiptDetail, PublicCampaign, PublicCampaignCategory } from '@/types';

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
  campaignSearchWithCategory: (
    query: string,
    categorySlug: string | undefined,
    status: HomeCampaignStatusFilter,
    verifiedOnly: boolean,
    pageSize: number,
  ) => [...publicKeys.all, 'campaignSearch', query, categorySlug ?? '', status, verifiedOnly, pageSize] as const,
  campaignCategories: () => [...publicKeys.all, 'campaignCategories'] as const,
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
  options?: { enabled?: boolean; initialData?: PublicListResponse<PublicOrganization> },
) {
  return useQuery({
    queryKey: publicKeys.organizations(query, page, verifiedOnly, activeOnly, sortBy, pageSize),
    queryFn: () => publicService.searchOrganizations(query, page, verifiedOnly, activeOnly, sortBy, pageSize),
    enabled: options?.enabled ?? true,
    ...publicQueryDefaults,
    ...options,
  });
}

export function useHomeCampaignFeed(
  query: string,
  categorySlug: string | undefined,
  status: HomeCampaignStatusFilter,
  verifiedOnly: boolean,
  pageSize = 24,
  options?: { enabled?: boolean; initialData?: PublicCampaign[] },
) {
  return useQuery({
    queryKey: publicKeys.campaignSearchWithCategory(query, categorySlug, status, verifiedOnly, pageSize),
    queryFn: async () => {
      const response = await publicService.searchCampaigns(
        query,
        categorySlug,
        mapHomeStatusToCampaignStatus(status),
        verifiedOnly,
        1,
        pageSize,
      );

      return response.items;
    },
    enabled: options?.enabled ?? true,
    ...publicQueryDefaults,
    ...options,
  });
}

export function usePublicCampaignCategories(options?: { enabled?: boolean; initialData?: PublicCampaignCategory[] }) {
  return useQuery({
    queryKey: publicKeys.campaignCategories(),
    queryFn: () => publicService.getCampaignCategories(),
    enabled: options?.enabled ?? true,
    ...publicQueryDefaults,
    ...options,
  });
}

export function usePublicOrganization(slug: string | null | undefined, options?: { initialData?: PublicOrganization }) {
  return useQuery({
    queryKey: publicKeys.organization(slug ?? ''),
    queryFn: () => publicService.getOrganization(slug ?? ''),
    enabled: Boolean(slug),
    ...publicQueryDefaults,
    ...options,
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

export function usePublicCampaign(campaignId: string | null | undefined, options?: { initialData?: PublicCampaignDetail }) {
  return useQuery({
    queryKey: publicKeys.campaign(campaignId ?? ''),
    queryFn: () => publicService.getCampaign(campaignId ?? ''),
    enabled: Boolean(campaignId),
    ...publicQueryDefaults,
    ...options,
  });
}

export async function fetchAllCampaignReceipts(campaignId: string, page = 1): Promise<PublicListResponse<PublicReceipt>> {
  const firstPage = await publicService.getCampaignReceipts(campaignId, page, 50);
  if (firstPage.items.length >= firstPage.totalCount) {
    return firstPage;
  }

  const totalPages = Math.ceil(firstPage.totalCount / firstPage.pageSize);
  const remainingPages = Array.from({ length: Math.max(0, totalPages - page) }, (_, index) => page + index + 1);
  const nextPages = await Promise.all(
    remainingPages.map((pageNumber) => publicService.getCampaignReceipts(campaignId, pageNumber, firstPage.pageSize)),
  );

  return {
    ...firstPage,
    items: [
      ...firstPage.items,
      ...nextPages.flatMap((response) => response.items),
    ],
  };
}

export function usePublicCampaignReceipts(campaignId: string | null | undefined, page = 1) {
  return useQuery({
    queryKey: publicKeys.campaignReceipts(campaignId ?? '', page),
    queryFn: () => fetchAllCampaignReceipts(campaignId ?? '', page),
    enabled: Boolean(campaignId),
    ...publicQueryDefaults,
  });
}

export function usePublicReceipt(receiptId: string | null | undefined, options?: { initialData?: PublicReceiptDetail }) {
  return useQuery({
    queryKey: publicKeys.receipt(receiptId ?? ''),
    queryFn: () => publicService.getReceipt(receiptId ?? ''),
    enabled: Boolean(receiptId),
    ...publicQueryDefaults,
    ...options,
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

// React Router 7 clientLoader helpers
export const getPublicCampaignCategoriesOptions = () => ({
  queryKey: publicKeys.campaignCategories(),
  queryFn: () => publicService.getCampaignCategories(),
  ...publicQueryDefaults,
});

export const getHomeCampaignFeedOptions = (
  query: string,
  categorySlug: string | undefined,
  status: HomeCampaignStatusFilter,
  verifiedOnly: boolean,
  pageSize = 24,
) => ({
  queryKey: publicKeys.campaignSearchWithCategory(query, categorySlug, status, verifiedOnly, pageSize),
  queryFn: async () => {
    const response = await publicService.searchCampaigns(
      query,
      categorySlug,
      mapHomeStatusToCampaignStatus(status),
      verifiedOnly,
      1,
      pageSize,
    );
    return response.items;
  },
  ...publicQueryDefaults,
});

export const getSearchOrganizationsOptions = (
  query: string,
  page: number,
  verifiedOnly: boolean,
  activeOnly: boolean,
  sortBy?: 'verified' | 'totalRaised' | 'activeCampaigns',
  pageSize = 12,
) => ({
  queryKey: publicKeys.organizations(query, page, verifiedOnly, activeOnly, sortBy, pageSize),
  queryFn: () => publicService.searchOrganizations(query, page, verifiedOnly, activeOnly, sortBy, pageSize),
  ...publicQueryDefaults,
});

export const getPublicOrganizationOptions = (slug: string) => ({
  queryKey: publicKeys.organization(slug),
  queryFn: () => publicService.getOrganization(slug),
  ...publicQueryDefaults,
});

export const getPublicOrgCampaignsOptions = (slug: string, status?: CampaignStatus, page = 1) => ({
  queryKey: publicKeys.orgCampaigns(slug, status, page),
  queryFn: () => publicService.getOrganizationCampaigns(slug, status, page),
  ...publicQueryDefaults,
});

export const getPublicCampaignOptions = (campaignId: string) => ({
  queryKey: publicKeys.campaign(campaignId),
  queryFn: () => publicService.getCampaign(campaignId),
  ...publicQueryDefaults,
});

export const getPublicReceiptOptions = (receiptId: string) => ({
  queryKey: publicKeys.receipt(receiptId),
  queryFn: () => publicService.getReceipt(receiptId),
  ...publicQueryDefaults,
});

export const getPublicCampaignReceiptsOptions = (campaignId: string, page = 1) => ({
  queryKey: publicKeys.campaignReceipts(campaignId, page),
  queryFn: () => fetchAllCampaignReceipts(campaignId, page),
  ...publicQueryDefaults,
});

export const getOrgTransparencyOptions = (slug: string) => ({
  queryKey: publicKeys.transparency(slug),
  queryFn: () => publicService.getOrganizationTransparency(slug),
  ...publicQueryDefaults,
});
