import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Expand } from 'lucide-react';
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

function getStatusLabel(status: number) {
  if (status === CampaignStatus.Active) return 'Активний';
  if (status === CampaignStatus.Completed) return 'Завершений';
  if (status === CampaignStatus.Paused) return 'Призупинений';
  return 'Чернетка';
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { i18n } = useTranslation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const campaignTitle = resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language);

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
    <Card className="group h-full overflow-hidden rounded-3xl border-border/80 bg-card/95 shadow-[0_16px_40px_var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_var(--shadow-soft)]">
      <CardHeader className="space-y-4 p-6 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" data-testid="home-campaign-status-badge">{getStatusLabel(campaign.status)}</Badge>
          <VerifiedBadge isVerified={campaign.organizationVerified} testId="home-campaign-org-verified-badge" />
        </div>

        {campaign.coverImageUrl ? (
          <button
            type="button"
            data-testid="home-campaign-cover-preview-button"
            aria-label="Відкрити фото збору"
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
          {campaign.description || 'Опис збору ще не додано.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 p-6 pt-2">
        <Progress value={progress} className="h-2.5" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">{new Intl.NumberFormat('uk-UA').format(campaign.currentAmount)} грн</span>
          <span className="text-muted-foreground">ціль {new Intl.NumberFormat('uk-UA').format(campaign.goalAmount)} грн</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-end justify-between gap-3 p-6 pt-1">
        <Link
          data-testid="home-campaign-org-link"
          to={`/o/${campaign.organizationSlug}`}
          className="inline-flex h-9 rounded-lg bg-secondary/15 px-2.5 py-1.5 text-sm font-semibold text-secondary transition-colors duration-200 hover:bg-secondary/25 items-center"
        >
          {campaign.organizationName}
        </Link>
        <Link
          data-testid="home-campaign-card-link"
          to={`/c/${campaign.id}`}
          className="inline-flex h-9 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.36)] transition-opacity duration-200 hover:opacity-95 items-center"
        >
          Переглянути збір
        </Link>
      </CardFooter>

      <PhotoGalleryDialog
        images={galleryImages}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
        title={campaignTitle}
        description="Попередній перегляд фото збору"
        testIdPrefix="home-campaign-cover-preview"
      />
    </Card>
  );
}
