import { useTranslation } from 'react-i18next';
import { CampaignCard } from '@/components/public/CampaignCard';
import { useHomeCampaignFeed } from '@/hooks/queries/usePublic';
import { Skeleton } from '@/components/ui/skeleton';

interface CrossLinkingSectionProps {
  currentCampaignId: string;
}

export function CrossLinkingSection({ currentCampaignId }: CrossLinkingSectionProps) {
  const { t } = useTranslation();
  const { data: campaigns, isLoading } = useHomeCampaignFeed('', undefined, 'active', true, 4);

  const otherCampaigns = campaigns?.filter((c) => c.id !== currentCampaignId).slice(0, 3) || [];

  if (isLoading) {
    return (
      <section className="mt-8 space-y-4">
        <h2 className="text-2xl font-bold">{t('campaigns.public.otherActiveCampaigns')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      </section>
    );
  }

  if (otherCampaigns.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 space-y-4" data-testid="public-cross-linking-section">
      <h2 className="text-2xl font-bold">{t('campaigns.public.otherActiveCampaigns')}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {otherCampaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </section>
  );
}
