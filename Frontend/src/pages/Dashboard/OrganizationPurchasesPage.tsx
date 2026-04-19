import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import { useCreatePurchase, usePurchases } from '@/hooks/queries/usePurchases';
import { PurchaseStatus } from '@/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { FileText, Plus, SearchX } from 'lucide-react';
import { toast } from 'sonner';

function getPurchaseStatusLabel(status: PurchaseStatus, t: TFunction) {
  switch (status) {
    case PurchaseStatus.PaymentSent:
      return t('purchases.status.paymentSent', 'Оплату проведено');
    case PurchaseStatus.PartiallyReceived:
      return t('purchases.status.partiallyReceived', 'Частково отримано');
    case PurchaseStatus.Completed:
      return t('purchases.status.completed', 'Завершено');
    case PurchaseStatus.Cancelled:
      return t('purchases.status.cancelled', 'Скасовано');
    default:
      return t('purchases.status.fallback', 'Статус {{status}}').replace('{{status}}', String(status));
  }
}

export default function OrganizationPurchasesPage() {
  const { t, i18n } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const campaignFromQuery = searchParams.get('campaignId') ?? '';

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: campaigns, isLoading: isCampaignsLoading } = useCampaigns(orgId);
  const createPurchase = useCreatePurchase();

  const selectedCampaignId = useMemo(() => {
    if (!campaigns || campaigns.length === 0) {
      return '';
    }

    if (campaignFromQuery && campaigns.some((campaign) => campaign.id === campaignFromQuery)) {
      return campaignFromQuery;
    }

    return campaigns[0].id;
  }, [campaignFromQuery, campaigns]);

  const handleCampaignChange = (campaignId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('campaignId', campaignId);
    setSearchParams(nextParams, { replace: true });
  };

  const selectedStatus = useMemo(
    () => (statusFilter === 'all' ? undefined : Number(statusFilter) as PurchaseStatus),
    [statusFilter],
  );

  const { data: purchases, isLoading: isPurchasesLoading } = usePurchases(
    orgId ?? '',
    selectedCampaignId,
    selectedStatus,
    Boolean(orgId && selectedCampaignId),
  );

  const activeCampaign = campaigns?.find((campaign) => campaign.id === selectedCampaignId);

  const handleCreatePurchase = async () => {
    if (!orgId || !selectedCampaignId) {
      toast.error(t('purchases.toasts.selectCampaignFirst', 'Спершу оберіть збір'));
      return;
    }

    try {
      const created = await createPurchase.mutateAsync({
        organizationId: orgId,
        campaignId: selectedCampaignId,
        payload: {
          title: t('purchases.defaultNewTitle', 'Нова закупівля'),
          totalAmount: 0,
        },
      });

      toast.success(t('purchases.createSuccess', 'Закупівлю створено'));
      navigate(`/dashboard/${orgId}/purchases/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  if (isCampaignsLoading) {
    return (
      <div className="space-y-4" data-testid="organization-purchases-page-loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card data-testid="organization-purchases-empty-campaigns">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('purchases.noCampaignsTitle', 'Немає зборів для закупівель')}</h2>
          <p className="max-w-xl text-sm text-muted-foreground">{t('purchases.noCampaignsDescription', 'Створіть збір і після цього зможете вести закупівлі та документи.')}</p>
          <Button onClick={() => navigate(`/dashboard/${orgId}/campaigns`)}>{t('campaigns.title', 'Збори')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="organization-purchases-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('purchases.overviewTitle', 'Закупівлі організації')}</h1>
          <p className="text-sm text-muted-foreground">{t('purchases.overviewDescription', 'Керуйте закупівлями по зборах, документами і OCR-обробкою.')}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedCampaignId} onValueChange={handleCampaignChange}>
            <SelectTrigger className="w-full sm:w-72" data-testid="organization-purchases-campaign-select-trigger">
              <SelectValue placeholder={t('purchases.filters.selectCampaign', 'Оберіть збір')} />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id} data-testid={`organization-purchases-campaign-option-${campaign.id}`}>
                  {resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-56" data-testid="organization-purchases-status-filter-trigger">
              <SelectValue placeholder={t('purchases.filters.statusAll', 'Усі статуси')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('purchases.filters.statusAll', 'Усі статуси')}</SelectItem>
              <SelectItem value={String(PurchaseStatus.PaymentSent)}>{t('purchases.status.paymentSent', 'Оплату проведено')}</SelectItem>
              <SelectItem value={String(PurchaseStatus.PartiallyReceived)}>{t('purchases.status.partiallyReceived', 'Частково отримано')}</SelectItem>
              <SelectItem value={String(PurchaseStatus.Completed)}>{t('purchases.status.completed', 'Завершено')}</SelectItem>
              <SelectItem value={String(PurchaseStatus.Cancelled)}>{t('purchases.status.cancelled', 'Скасовано')}</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleCreatePurchase} disabled={createPurchase.isPending} data-testid="organization-purchases-open-create-dialog">
            <Plus className="h-4 w-4" />
            {t('purchases.createNew', 'Нова закупівля')}
          </Button>
        </div>
      </div>

      <Card data-testid="organization-purchases-selected-campaign-card" className="border-border/70 bg-card/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('purchases.activeCampaign', 'Активний збір')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">{activeCampaign ? resolveLocalizedText(activeCampaign.titleUk, activeCampaign.titleEn, i18n.language) : t('common.na', 'Н/д')}</p>
          {selectedCampaignId ? (
            <Button variant="outline" asChild data-testid="organization-purchases-open-campaign-link">
              <Link to={`/dashboard/${orgId}/campaigns/${selectedCampaignId}`}>
                {t('purchases.openCampaignScope', 'Відкрити в межах збору')}
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {isPurchasesLoading ? (
        <div className="space-y-3" data-testid="organization-purchases-list-loading">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : purchases && purchases.length > 0 ? (
        <div className="grid gap-3" data-testid="organization-purchases-list">
          {purchases.map((purchase) => (
            <Link key={purchase.id} to={`/dashboard/${orgId}/purchases/${purchase.id}`} data-testid={`organization-purchases-item-link-${purchase.id}`}>
              <Card className="border-border/70 bg-card/92 transition hover:border-primary/35 hover:bg-card">
                <CardContent className="flex items-center justify-between p-4 sm:p-5">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate font-semibold text-base">{purchase.title}</h3>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {t('purchases.documentsCount', 'Документів')}: {purchase.documentCount}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-semibold">{new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'UAH' }).format(purchase.totalAmount / 100)}</p>
                    <Badge variant={purchase.status === PurchaseStatus.Completed ? 'default' : 'secondary'}>
                      {getPurchaseStatusLabel(purchase.status, t)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card data-testid="organization-purchases-empty-list" className="border-dashed border-2 border-border/70">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-semibold">{t('purchases.empty', 'Ще немає закупівель')}</p>
            <p className="max-w-lg text-sm text-muted-foreground">{t('purchases.emptyDescription', 'Закупівлі дозволяють групувати документи для фінансової звітності кампанії.')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
