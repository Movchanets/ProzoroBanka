import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CampaignStatus, type PublicCampaign } from '@/types';
import { VerifiedBadge } from './VerifiedBadge';

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
  const progress = campaign.goalAmount > 0
    ? Math.min(100, Math.round((campaign.currentAmount / campaign.goalAmount) * 100))
    : 0;

  return (
    <Card className="h-full border-border/80 bg-card/95">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" data-testid="home-campaign-status-badge">{getStatusLabel(campaign.status)}</Badge>
          <VerifiedBadge isVerified={campaign.organizationVerified} testId="home-campaign-org-verified-badge" />
        </div>
        <CardTitle className="line-clamp-2 text-lg">{campaign.title}</CardTitle>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {campaign.description || 'Опис збору ще не додано.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <Progress value={progress} className="h-2.5" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">{new Intl.NumberFormat('uk-UA').format(campaign.currentAmount)} грн</span>
          <span className="text-muted-foreground">ціль {new Intl.NumberFormat('uk-UA').format(campaign.goalAmount)} грн</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Link
          data-testid="home-campaign-org-link"
          to={`/o/${campaign.organizationSlug}`}
          className="inline-flex rounded-lg bg-secondary/15 px-2.5 py-1.5 text-sm font-semibold text-secondary hover:bg-secondary/25"
        >
          {campaign.organizationName}
        </Link>
        <Link
          data-testid="home-campaign-card-link"
          to={`/c/${campaign.id}`}
          className="inline-flex rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.36)] hover:opacity-95"
        >
          Переглянути збір
        </Link>
      </CardFooter>
    </Card>
  );
}
