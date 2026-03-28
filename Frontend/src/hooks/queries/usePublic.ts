import { useQuery } from '@tanstack/react-query';
import { CampaignStatus, type CampaignStatus as CampaignStatusType } from '@/types';
import { publicService } from '@/services/publicService';

type HomeCampaignStatusFilter = 'all' | 'active' | 'completed';

interface HomeCampaignFeedItem {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatusType;
  startDate?: string;
  deadline?: string;
  receiptCount: number;
  organizationName: string;
  organizationSlug: string;
  organizationVerified: boolean;
}

function mapHomeStatusToCampaignStatus(status: HomeCampaignStatusFilter): CampaignStatusType | undefined {
  if (status === 'active') return CampaignStatus.Active;
  if (status === 'completed') return CampaignStatus.Completed;
  return undefined;
}

export const publicKeys = {
  all: ['public'] as const,
  organizations: (query: string, page: number, verifiedOnly: boolean, activeOnly: boolean) =>
    [...publicKeys.all, 'organizations', query, page, verifiedOnly, activeOnly] as const,
  homeCampaignFeed: (query: string, status: HomeCampaignStatusFilter, verifiedOnly: boolean) =>
    [...publicKeys.all, 'homeCampaignFeed', query, status, verifiedOnly] as const,
  organization: (slug: string) => [...publicKeys.all, 'organization', slug] as const,
  orgCampaigns: (slug: string, status: CampaignStatus | undefined, page: number) =>
    [...publicKeys.all, 'orgCampaigns', slug, status, page] as const,
  campaign: (campaignId: string) => [...publicKeys.all, 'campaign', campaignId] as const,
  campaignReceipts: (campaignId: string, page: number) =>
    [...publicKeys.all, 'campaignReceipts', campaignId, page] as const,
  transparency: (slug: string) => [...publicKeys.all, 'transparency', slug] as const,
};

const publicQueryDefaults = {
  staleTime: 60_000,
  retry: 1,
} as const;

export function useSearchOrganizations(query: string, page: number, verifiedOnly: boolean, activeOnly: boolean) {
  return useQuery({
    queryKey: publicKeys.organizations(query, page, verifiedOnly, activeOnly),
    queryFn: () => publicService.searchOrganizations(query, page, verifiedOnly, activeOnly),
    ...publicQueryDefaults,
  });
}

export function useHomeCampaignFeed(query: string, status: HomeCampaignStatusFilter, verifiedOnly: boolean) {
  return useQuery({
    queryKey: publicKeys.homeCampaignFeed(query, status, verifiedOnly),
    queryFn: async () => {
      const organizations = await publicService.searchOrganizations(query, 1, verifiedOnly, false, 8);
      const campaignStatus = mapHomeStatusToCampaignStatus(status);

      const campaignPages = await Promise.all(
        organizations.items.map(async (organization) => {
          const campaigns = await publicService.getOrganizationCampaigns(organization.slug, campaignStatus, 1, 6);
          return campaigns.items.map((campaign) => ({
            ...campaign,
            organizationVerified: organization.isVerified,
          }));
        }),
      );

      const merged = campaignPages.flat();
      const term = query.trim().toLowerCase();

      const filtered = term
        ? merged.filter((item) =>
          item.title.toLowerCase().includes(term) ||
          item.organizationName.toLowerCase().includes(term) ||
          (item.description?.toLowerCase().includes(term) ?? false),
        )
        : merged;

      const sorted = filtered.sort((a, b) => {
        const statusWeight = Number(b.status === CampaignStatus.Active) - Number(a.status === CampaignStatus.Active);
        if (statusWeight !== 0) return statusWeight;
        return b.currentAmount - a.currentAmount;
      });

      return sorted.slice(0, 24) as HomeCampaignFeedItem[];
    },
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
    queryFn: () => publicService.getCampaignReceipts(campaignId ?? '', page),
    enabled: Boolean(campaignId),
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
