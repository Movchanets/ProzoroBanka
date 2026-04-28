import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Expand } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoGalleryDialog } from '@/components/ui/photo-gallery-dialog';
import { Progress } from '@/components/ui/progress';
import { CampaignStatus, type PublicCampaign } from '@/types';
import { VerifiedBadge } from './VerifiedBadge';
import { resolveLocalizedText } from '@/lib/localizedText';
import { useTranslation } from 'react-i18next';

interface CampaignCardProps {
  campaign: PublicCampaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { t, i18n } = useTranslation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const campaignTitle = resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language);

  const getStatusLabel = (status: number) => {
    if (status === CampaignStatus.Active) return t('campaigns.card.statusActive');
    if (status === CampaignStatus.Completed) return t('campaigns.card.statusCompleted');
    if (status === CampaignStatus.Paused) return t('campaigns.card.statusPaused');
    return t('campaigns.card.statusDraft');
  };

  const galleryImages = campaign.coverImageUrl
    ? [{
      src: campaign.coverImageUrl,
      alt: campaignTitle,
      caption: campaignTitle,
    }]
    : [];

  const progress = campaign.goalAmount > 0
    ? Math.min(100, Math.round((campaign.currentAmount / campaign.goalAmount) * 100))
    : 0;

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-3xl border-border/80 bg-card/95 shadow-[0_16px_40px_var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_var(--shadow-soft)]">
      <CardHeader className="flex-1 space-y-4 p-6 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" data-testid="home-campaign-status-badge">{getStatusLabel(campaign.status)}</Badge>
          <VerifiedBadge isVerified={campaign.organizationVerified} testId="home-campaign-org-verified-badge" />
        </div>

        {campaign.coverImageUrl ? (
          <button
            type="button"
            data-testid="home-campaign-cover-preview-button"
            aria-label={t('campaigns.card.openPhoto')}
            onClick={() => {
              setPreviewIndex(0);
              setIsPreviewOpen(true);
            }}
            className="group/preview relative h-24 w-36 cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-[0_10px_24px_var(--shadow-soft)] transition-opacity duration-200 hover:opacity-95"
          >
            <img
              src={campaign.coverImageUrl}
              alt={campaignTitle}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
              data-testid="home-campaign-cover-thumbnail-image"
            />
            <span className="pointer-events-none absolute inset-0 grid place-items-center bg-foreground/20 opacity-0 transition-opacity duration-300 group-hover/preview:opacity-100">
              <Expand className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
          </button>
        ) : null}

        <CardTitle className="line-clamp-2 text-lg leading-7">{campaignTitle}</CardTitle>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {campaign.description || t('campaigns.public.descriptionFallback')}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 p-6 pt-2">
        <Progress value={progress} className="h-2.5" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">{new Intl.NumberFormat(i18n.language).format(campaign.currentAmount)} {t('common.uah')}</span>
          <span className="text-muted-foreground">{t('campaigns.progressBar.goal')} {new Intl.NumberFormat(i18n.language).format(campaign.goalAmount)} {t('common.uah')}</span>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 p-0">
        <Link
          data-testid="home-campaign-org-link"
          to={`/o/${campaign.organizationSlug}`}
          className="flex-1 truncate px-6 py-3.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/40 hover:text-foreground"
        >
          {campaign.organizationName}
        </Link>
        <Link
          data-testid="home-campaign-card-link"
          to={`/c/${campaign.id}`}
          className="flex items-center gap-1.5 border-l border-border/60 px-5 py-3.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/40 hover:text-foreground"
        >
          {t('campaigns.card.viewCampaign')}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </CardFooter>

      <PhotoGalleryDialog
        images={galleryImages}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
        title={campaignTitle}
        description={t('campaigns.card.previewDescription')}
        testIdPrefix="home-campaign-cover-preview"
      />
    </Card>
  );
}
