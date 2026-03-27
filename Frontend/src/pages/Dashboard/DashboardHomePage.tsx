import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '@/hooks/queries/useOrganizations';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import { CampaignStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, HandCoins, Megaphone, Users, Zap } from 'lucide-react';

export default function DashboardHomePage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: campaigns, isLoading: campLoading } = useCampaigns(orgId);

  const isLoading = orgLoading || campLoading;

  const activeCampaigns = campaigns?.filter((c) => c.status === CampaignStatus.Active).length ?? 0;
  const totalRaised = campaigns?.reduce((sum, c) => sum + c.currentAmount, 0) ?? 0;
  const totalWithdrawn = campaigns?.reduce((sum, c) => sum + c.withdrawnAmount, 0) ?? 0;
  const raisedFormatted = new Intl.NumberFormat('uk-UA').format(totalRaised / 100);
  const withdrawnFormatted = new Intl.NumberFormat('uk-UA').format(totalWithdrawn / 100);

  const stats = [
    { icon: <Users className="h-5 w-5" />, label: t('dashboard.statMembers'), value: org?.memberCount ?? 0 },
    { icon: <Megaphone className="h-5 w-5" />, label: t('dashboard.statActiveCampaigns'), value: activeCampaigns },
    { icon: <BarChart3 className="h-5 w-5" />, label: t('dashboard.statRaised'), value: raisedFormatted },
    { icon: <HandCoins className="h-5 w-5" />, label: t('dashboard.statWithdrawn'), value: withdrawnFormatted },
  ];

  const steps = [
    t('dashboard.step1'),
    t('dashboard.step2'),
    t('dashboard.step3'),
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-28 rounded-2xl" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t('dashboard.welcomeOrg', { name: org?.name })}</h2>
        <p className="text-muted-foreground">{t('dashboard.overviewSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-border bg-card/60 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            {t('dashboard.quickStart')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            {steps.map((step, i) => (<li key={i}>{step}</li>))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
