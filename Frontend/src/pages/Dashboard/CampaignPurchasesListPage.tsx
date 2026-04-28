import { useMemo, useState, useEffect } from 'react';
import { useSubmit, useActionData, useNavigation, useParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { usePurchases, getPurchasesOptions, purchaseKeys } from '@/hooks/queries/usePurchases';
import { useCampaign, getCampaignOptions } from '@/hooks/queries/useCampaigns';
import { ensureQueryData } from '@/utils/routerHelpers';
import type { ActionFunctionArgs as ClientActionArgs, LoaderFunctionArgs } from 'react-router';
import { PurchaseStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { purchaseService } from '@/services/purchaseService';
import { queryClient } from '@/services/queryClient';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ArrowLeft, Plus, ReceiptText, SearchX, FileText, Loader2 } from 'lucide-react';
import { resolveLocalizedText } from '@/lib/localizedText';
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

// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader({ params }: LoaderFunctionArgs) {
  const { orgId, campaignId } = params;
  if (!orgId || !campaignId) return null;

  await Promise.allSettled([
    ensureQueryData(getCampaignOptions(campaignId)),
    ensureQueryData(getPurchasesOptions(orgId, campaignId)),
  ]);
  return null;
}

export async function clientAction({ request, params }: ClientActionArgs) {
  const { orgId, campaignId } = params;
  if (!orgId || !campaignId) throw new Error('Params missing');

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createPurchase') {
    const title = String(formData.get('title'));
    try {
      const purchase = await purchaseService.create(orgId, campaignId, { title, totalAmount: 0 });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(orgId, campaignId) });
      return { success: true, intent: 'create', purchaseId: purchase.id };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create purchase' };
    }
  }

  return { error: 'Unknown intent' };
}

export default function CampaignPurchasesListPage() {
  const { t, i18n } = useTranslation();
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData() as { success?: boolean; purchaseId?: string; error?: string } | undefined;
  const navigation = useNavigation();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const selectedStatus = useMemo(
    () => (statusFilter === 'all' ? undefined : Number(statusFilter) as PurchaseStatus),
    [statusFilter],
  );

  const { data: campaign, isLoading: isCampaignLoading } = useCampaign(campaignId);
  const { data: purchases, isLoading: isPurchasesLoading } = usePurchases(orgId!, campaignId!, selectedStatus);

  useEffect(() => {
    if (actionData?.success && actionData.purchaseId) {
      toast.success(t('purchases.createSuccess', 'Закупівлю створено'));
      navigate(`/dashboard/${orgId}/purchases/${actionData.purchaseId}`);
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData, navigate, t, orgId]);

  const handleCreatePurchase = () => {
    const formData = new FormData();
    formData.append('intent', 'createPurchase');
    formData.append('title', t('purchases.defaultNewTitle', 'Нова закупівля'));
    submit(formData, { method: 'post' });
  };

  const isPending = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'createPurchase';

  if (isCampaignLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <SearchX className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t('campaigns.notFound', 'Збір не знайдено')}</p>
        <Button variant="outline" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const campaignTitle = resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language);

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="campaign-purchases-page">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${orgId}/campaigns/${campaignId}`)} className="-ml-3" data-testid="campaign-purchases-back-button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.backToCampaign', 'До збору')}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t('purchases.listTitle', 'Закупівлі')}</h2>
            <p className="text-sm text-muted-foreground">{campaignTitle}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56" data-testid="campaign-purchases-status-filter-trigger">
                <SelectValue placeholder={t('purchases.filters.statusAll', 'Усі статуси')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="campaign-purchases-status-filter-all">{t('purchases.filters.statusAll', 'Усі статуси')}</SelectItem>
                <SelectItem value={String(PurchaseStatus.PaymentSent)} data-testid="campaign-purchases-status-filter-payment-sent">{t('purchases.status.paymentSent', 'Оплату проведено')}</SelectItem>
                <SelectItem value={String(PurchaseStatus.PartiallyReceived)} data-testid="campaign-purchases-status-filter-partially-received">{t('purchases.status.partiallyReceived', 'Частково отримано')}</SelectItem>
                <SelectItem value={String(PurchaseStatus.Completed)} data-testid="campaign-purchases-status-filter-completed">{t('purchases.status.completed', 'Завершено')}</SelectItem>
                <SelectItem value={String(PurchaseStatus.Cancelled)} data-testid="campaign-purchases-status-filter-cancelled">{t('purchases.status.cancelled', 'Скасовано')}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleCreatePurchase} disabled={isPending} data-testid="campaign-purchases-open-create-dialog">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Plus className="h-4 w-4 mr-1" />
              {t('purchases.createNew', 'Нова закупівля')}
            </Button>
          </div>
        </div>
      </div>

      {isPurchasesLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : purchases?.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-card/40 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ReceiptText className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">{t('purchases.empty', 'Ще немає закупівель')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('purchases.emptyDescription', 'Закупівлі дозволяють групувати документи (вид. накладні, акти, чеки) для звітування.')}
            </p>
            <Button className="mt-2" onClick={handleCreatePurchase} disabled={isPending} data-testid="campaign-purchases-empty-create-button">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Plus className="h-4 w-4 mr-1" />
              {t('purchases.createNew', 'Створити')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {purchases?.map((purchase) => (
            <Link key={purchase.id} to={`/dashboard/${orgId}/purchases/${purchase.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4 sm:p-5">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate font-semibold text-base">{purchase.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {t('purchases.documentsCount', 'Документів')}: {purchase.documentCount}
                      </span>
                      <span>
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
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
      )}
    </div>
  );
}
