import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import { CampaignStatusLabel, type Campaign } from '@/types';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Plus, Calendar, Globe } from 'lucide-react';

const statusColor: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-success/15 text-success',
  2: 'bg-primary/15 text-primary',
  3: 'bg-secondary/15 text-secondary',
};

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const progress = campaign.goalAmount > 0
    ? Math.min(100, Math.round((campaign.currentAmount / campaign.goalAmount) * 100))
    : 0;
  const raised = new Intl.NumberFormat('uk-UA').format(campaign.currentAmount / 100);
  const goal = new Intl.NumberFormat('uk-UA').format(campaign.goalAmount / 100);
  const withdrawn = new Intl.NumberFormat('uk-UA').format(campaign.withdrawnAmount / 100);

  return (
    <Card
      className="cursor-pointer border border-border bg-card/60 backdrop-blur-sm transition-shadow hover:shadow-lg"
      onClick={() => navigate(`${campaign.id}`)}
      data-testid={`campaign-card-${campaign.id}`}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight" data-testid={`campaign-card-title-${campaign.id}`}>{campaign.title}</h3>
          <Badge className={statusColor[campaign.status]} data-testid={`campaign-card-status-${campaign.id}`}>{t(CampaignStatusLabel[campaign.status])}</Badge>
        </div>
        {campaign.description && (<p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>)}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{raised} ₴ <span className="text-muted-foreground/60">/ {goal} ₴</span></span>
            <span className="font-semibold text-primary">{progress}%</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid={`campaign-card-withdrawn-${campaign.id}`}>
            {t('campaigns.withdrawnPrefix')}: {withdrawn} ₴
          </p>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
          {campaign.deadline && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t('campaigns.deadlinePrefix')} {new Date(campaign.deadline).toLocaleDateString('uk-UA')}
            </div>
          )}
          {typeof campaign.receiptCount === 'number' && (
            <Badge variant="outline" className="font-normal text-xs px-1.5 py-0 h-5">
              Receipts: {campaign.receiptCount}
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          data-testid={`campaign-card-public-link-${campaign.id}`}
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/c/${campaign.id}`);
          }}
        >
          <Globe className="h-4 w-4" />
          {t('campaigns.openPublicCampaignPage')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CampaignsListPage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaigns(orgId);

  return (
    <div className="space-y-6" data-testid="campaigns-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2" data-testid="campaigns-list-title">
            <Megaphone className="h-6 w-6 text-primary" />
            {t('campaigns.title')}
          </h2>
          <p className="text-muted-foreground">{t('campaigns.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('new')} data-testid="campaigns-list-create-button">
          <Plus className="h-4 w-4" />
          {t('campaigns.newCampaign')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-48 rounded-2xl" />))}
        </div>
      ) : campaigns?.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-card/40 backdrop-blur-sm" data-testid="campaigns-empty-state-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/40" />
            <CardTitle className="text-lg">{t('campaigns.empty')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('campaigns.emptyDescription')}</p>
            <Button className="mt-2" onClick={() => navigate('new')} data-testid="campaigns-empty-create-button">
              <Plus className="h-4 w-4" />
              {t('campaigns.createCampaign')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="campaigns-list-grid">
          {campaigns?.map((c) => (<CampaignCard key={c.id} campaign={c} />))}
        </div>
      )}
    </div>
  );
}
