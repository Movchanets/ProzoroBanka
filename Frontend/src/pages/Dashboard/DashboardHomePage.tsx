import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useOrganization, useOrganizationStateRegistrySettings } from '@/hooks/queries/useOrganizations';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import { CampaignStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Globe, Megaphone, ReceiptText, Users, Zap, ShieldCheck, ScanSearch, ShieldAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PLAN_LABELS: Record<number, string> = {
  1: 'Free',
  2: 'Paid',
};

const PLAN_DESCRIPTIONS: Record<number, string> = {
  1: 'Безкоштовний тариф: до 3 кампаній, до 10 учасників, до 100 OCR-розпізнавань на місяць.',
  2: 'Платний тариф: до 100 кампаній, до 200 учасників, до 5000 OCR-розпізнавань на місяць.',
};

export default function DashboardHomePage() {
  const { t } = useTranslation();
  const { orgId } = useParams({ from: '/dashboard/$orgId/' });
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: usageSettings, isLoading: usageLoading, isError: isUsageError } = useOrganizationStateRegistrySettings(orgId);
  const { data: campaigns, isLoading: campLoading } = useCampaigns(orgId);

  const isLoading = orgLoading || campLoading;

  const activeCampaigns = campaigns?.filter((c) => c.status === CampaignStatus.Active).length ?? 0;
  const totalRaised = campaigns?.reduce((sum, c) => sum + c.currentAmount, 0) ?? 0;
  const totalReceipts = campaigns?.reduce((sum, c) => sum + (c.receiptCount ?? 0), 0) ?? 0;
  const raisedFormatted = new Intl.NumberFormat('uk-UA').format(totalRaised / 100);

  const stats = [
    { icon: <Users className="h-5 w-5" />, label: t('dashboard.statMembers'), value: org?.memberCount ?? 0 },
    { icon: <Megaphone className="h-5 w-5" />, label: t('dashboard.statActiveCampaigns'), value: activeCampaigns },
    { icon: <BarChart3 className="h-5 w-5" />, label: t('dashboard.statRaised'), value: raisedFormatted },
    { icon: <ReceiptText className="h-5 w-5" />, label: t('dashboard.statReceipts'), value: totalReceipts },
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
      {org?.isBlocked && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive" data-testid="dashboard-org-blocked-banner">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="ml-2 font-semibold">Організацію заблоковано</AlertTitle>
          <AlertDescription className="ml-2 mt-1">
            Можливості вашої організації обмежені. Причина: <span className="font-medium">{org?.blockReason || 'Не вказана'}</span>. Зверніться до підтримки.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('dashboard.welcomeOrg', { name: org?.name })}</h2>
          <p className="text-muted-foreground">{t('dashboard.overviewSubtitle')}</p>
        </div>

        {org?.slug ? (
          <Button asChild variant="outline" size="sm" data-testid="dashboard-home-public-organization-link" className="gap-2 shadow-none">
            <Link to={`/o/${org.slug}`}>
              <Globe className="h-4 w-4" />
              {t('dashboard.openPublicOrganizationPage')}
            </Link>
          </Button>
        ) : null}
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

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-home-plan-card">
        <CardHeader>
          <CardTitle className="text-lg" data-testid="dashboard-home-plan-title">Тариф організації</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground" data-testid="dashboard-home-plan-name">
            Поточний тариф: <span className="font-medium text-foreground">{PLAN_LABELS[org?.planType ?? 1]}</span>
          </p>
          <p className="text-sm text-muted-foreground" data-testid="dashboard-home-plan-description">
            {PLAN_DESCRIPTIONS[org?.planType ?? 1]}
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-home-usage-card">
        <CardHeader>
          <CardTitle className="text-lg" data-testid="dashboard-home-usage-title">Ліміти та використання</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4" data-testid="dashboard-home-usage-state-block">
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              State verification usage
            </p>
            <p className="mt-1 text-base font-semibold" data-testid="dashboard-home-usage-state-value">
              {usageLoading
                ? 'Завантаження...'
                : isUsageError
                  ? 'Недоступно'
                  : `${usageSettings?.stateVerificationConfiguredKeys ?? 0} / ${usageSettings?.stateVerificationMaxKeys ?? 0}`}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4" data-testid="dashboard-home-usage-ocr-block">
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ScanSearch className="h-4 w-4" />
              OCR usage
            </p>
            <p className="mt-1 text-base font-semibold" data-testid="dashboard-home-usage-ocr-value">
              {usageLoading
                ? 'Завантаження...'
                : isUsageError
                  ? 'Недоступно'
                  : `${usageSettings?.currentOcrExtractionsPerMonth ?? 0} / ${usageSettings?.maxOcrExtractionsPerMonth ?? 0}`}
            </p>
          </div>
        </CardContent>
      </Card>

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
