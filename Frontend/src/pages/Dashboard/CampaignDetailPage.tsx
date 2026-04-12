import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAttachReceiptToCampaign,
  useAddCampaignPhoto,
  useCampaign,
  useCampaignPhotos,
  useCampaignReceipts,
  useCampaignTransactions,
  useDetachReceiptFromCampaign,
  useUpdateCampaignBalance,
} from '@/hooks/queries/useCampaigns';
import {
  CampaignStatusLabel,
  ReceiptPublicationStatus,
  ReceiptStatus,
  type ReceiptListItem,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CampaignProgressBar } from '@/components/public/CampaignProgressBar';
import { ArrowLeft, ArrowUpRight, Calendar, Edit2, Megaphone, ReceiptText, HandCoins, Clock3, Handshake, Loader2, Plus, ImageIcon, Eye, MoreVertical, Newspaper } from 'lucide-react';
import { SelectReceiptDialog } from './SelectReceiptDialog';
import { CampaignPhotoGallery } from './CampaignPhotoGallery';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const statusColor: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-success/15 text-success',
  2: 'bg-primary/15 text-primary',
  3: 'bg-secondary/15 text-secondary',
};


function formatCampaignMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatCampaignDateTime(value: string | undefined, locale: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getReceiptDisplayTitle(receipt: ReceiptListItem) {
  return receipt.alias || receipt.merchantName || receipt.originalFileName;
}

type InsightTab = 'receipts' | 'transactions';

export default function CampaignDetailPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('uk') ? 'uk-UA' : 'en-US';
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const {
    data: attachedReceipts = [],
    isLoading: isReceiptsLoading,
    isError: isReceiptsError,
  } = useCampaignReceipts(campaignId);
  const attachReceiptToCampaign = useAttachReceiptToCampaign(orgId!);
  const detachReceiptFromCampaign = useDetachReceiptFromCampaign(orgId!);
  const updateCampaignBalance = useUpdateCampaignBalance(orgId!);
  const { data: campaignPhotos = [] } = useCampaignPhotos(campaignId);
  const addCampaignPhoto = useAddCampaignPhoto(campaignId!);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const transactionsPageSize = 10;
  const {
    data: transactions,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    refetch: refetchTransactions,
  } = useCampaignTransactions(campaignId, transactionsPage, transactionsPageSize);

  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [insightTab, setInsightTab] = useState<InsightTab>('receipts');
  const [manualAmountUah, setManualAmountUah] = useState<string>('');
  const [manualReason, setManualReason] = useState('');
  const [manualUpdateError, setManualUpdateError] = useState<string | null>(null);
  const [postDescription, setPostDescription] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" data-testid="campaign-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-75 w-full rounded-2xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" data-testid="campaign-detail-not-found-page">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)} data-testid="campaign-detail-back-button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="text-center py-12 text-muted-foreground" data-testid="campaign-detail-not-found-text">
          {t('campaigns.notFound', 'Збір не знайдено')}
        </div>
      </div>
    );
  }

  const withdrawn = new Intl.NumberFormat('uk-UA').format(campaign.withdrawnAmount / 100);

  const handleAttachReceipt = async (receiptId: string) => {
    if (!campaignId) {
      return;
    }

    try {
      await attachReceiptToCampaign.mutateAsync({ campaignId, receiptId });
      setIsReceiptDialogOpen(false);
      toast.success(t('campaigns.detail.receiptAttachedDraft', 'Чек прикріплено до збору'));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('campaigns.detail.receiptAttachError', 'Не вдалося прикріпити чек');
      toast.error(message);
    }
  };

  const handleDetachReceipt = async (receiptId: string) => {
    if (!campaignId) return;
    try {
      await detachReceiptFromCampaign.mutateAsync({ campaignId, receiptId });
      toast.success(t('campaigns.detail.receiptDetached', 'Чек відкріплено від збору'));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('campaigns.detail.receiptDetachError', 'Не вдалося відкріпити чек');
      toast.error(message);
    }
  };

  const handleCreatePost = async () => {
    if (!postImageFile) {
      toast.error(t('campaigns.posts.imageRequired', 'Додайте зображення для поста'));
      return;
    }

    try {
      await addCampaignPhoto.mutateAsync({
        file: postImageFile,
        description: postDescription.trim() || undefined,
      });
      setPostDescription('');
      setPostImageFile(null);
      toast.success(t('campaigns.posts.createSuccess', 'Пост опубліковано'));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('campaigns.posts.createError', 'Не вдалося створити пост');
      toast.error(message);
    }
  };

  const currentCount = attachedReceipts.length || campaign.receiptCount || 0;
  const previewReceipts = attachedReceipts.slice(0, 3);
  const hiddenReceiptsCount = Math.max(0, attachedReceipts.length - previewReceipts.length);
  const previewTransactions = (transactions ?? []).slice(0, 3);
  const hasNextTransactionsPage = (transactions?.length ?? 0) === transactionsPageSize;
  const activeReceiptsCount = attachedReceipts.filter((receipt) => receipt.publicationStatus === ReceiptPublicationStatus.Active).length;
  const verifiedReceiptsCount = attachedReceipts.filter((receipt) => receipt.status === ReceiptStatus.StateVerified).length;
  const documentedAmountMinor = campaign.documentedAmount;
  const transactionsPageTotalAmount = (transactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0);

  const openInsightPanel = (tab: InsightTab) => {
    setInsightTab(tab);
    setIsInsightsOpen(true);
  };

  const handleManualProgressUpdate = async () => {
    setManualUpdateError(null);

    const effectiveAmount = manualAmountUah || (campaign.currentAmount / 100).toFixed(2);
    const parsedAmount = Number(effectiveAmount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setManualUpdateError(t('campaigns.manualProgress.amountInvalid', 'Введіть коректну суму'));
      return;
    }

    try {
      await updateCampaignBalance.mutateAsync({
        id: campaign.id,
        payload: {
          newCurrentAmount: Math.round(parsedAmount * 100),
          reason: manualReason.trim() || undefined,
        },
      });

      setManualAmountUah(parsedAmount.toFixed(2));
      setManualReason('');
      toast.success(t('campaigns.manualProgress.success', 'Прогрес збору оновлено'));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('campaigns.manualProgress.error', 'Не вдалося оновити прогрес збору');
      setManualUpdateError(message);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6" data-testid="campaign-detail-page">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)} data-testid="campaign-detail-back-button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/${orgId}/campaigns/${campaignId}/edit`)} data-testid="campaign-detail-edit-button">
          <Edit2 className="h-4 w-4 mr-2" />
          {t('common.edit')}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_380px]">
        {/* Main Details */}
        <div className="space-y-6">
          <Card className="border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
            {campaign.coverImageUrl && (
              <div className="relative h-64 w-full bg-muted">
                <img 
                  src={campaign.coverImageUrl} 
                  alt={campaign.title} 
                  className="h-full w-full object-cover" 
                />
              </div>
            )}
            {!campaign.coverImageUrl && (
              <div className="relative h-64 w-full overflow-hidden bg-linear-to-br from-primary/15 via-accent/10 to-secondary/10" data-testid="campaign-detail-image-placeholder">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.25),transparent_48%),radial-gradient(circle_at_80%_25%,hsl(var(--secondary)/0.2),transparent_42%)]" />
                <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="rounded-full border border-border/70 bg-card/80 p-3">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{t('campaigns.detail.coverPlaceholderTitle')}</p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    {t('campaigns.detail.coverPlaceholderDescription')}
                  </p>
                </div>
              </div>
            )}
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <CardTitle className="text-2xl font-bold break-all" data-testid="campaign-detail-title">{campaign.title}</CardTitle>
                <Badge className={statusColor[campaign.status]} data-testid="campaign-detail-status-badge">{t(CampaignStatusLabel[campaign.status])}</Badge>
              </div>
              
              <div className="space-y-2">
                <CampaignProgressBar
                  currentAmount={campaign.currentAmount / 100}
                  goalAmount={campaign.goalAmount / 100}
                  documentedAmount={documentedAmountMinor / 100}
                  documentationPercent={campaign.documentationPercent}
                  testId="campaign-detail-progress"
                />
                <p className="text-xs text-muted-foreground" data-testid="campaign-detail-withdrawn-amount">
                  {t('campaigns.withdrawnPrefix')}: {withdrawn} ₴
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {campaign.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {campaign.description.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border/50 pt-4">
                <div className="flex items-center gap-1.5 break-all" data-testid="campaign-detail-short-id">
                  <Megaphone className="h-4 w-4 min-w-4" />
                  {t('campaigns.detail.shortIdPrefix', 'ID-збору')}: {campaign.id.substring(0, 8)}
                </div>
                {campaign.deadline && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {t('campaigns.deadlinePrefix')} {new Date(campaign.deadline).toLocaleDateString(locale)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="campaign-detail-posts-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="campaign-detail-posts-title">
                <Newspaper className="h-5 w-5 text-primary" />
                {t('campaigns.posts.title', 'Пости збору')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-post-description">{t('campaigns.posts.descriptionLabel', 'Текст поста')}</Label>
                <Textarea
                  id="campaign-post-description"
                  value={postDescription}
                  onChange={(event) => setPostDescription(event.target.value)}
                  placeholder={t('campaigns.posts.descriptionPlaceholder', 'Опишіть оновлення по збору')}
                  data-testid="campaign-detail-post-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-post-image">{t('campaigns.posts.imageLabel', 'Зображення')}</Label>
                <Input
                  id="campaign-post-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPostImageFile(event.target.files?.[0] ?? null)}
                  data-testid="campaign-detail-post-image-input"
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleCreatePost()}
                disabled={addCampaignPhoto.isPending}
                data-testid="campaign-detail-post-submit-button"
              >
                {addCampaignPhoto.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('campaigns.posts.submit', 'Опублікувати пост')}
              </Button>

              <div className="space-y-3 pt-2" data-testid="campaign-detail-posts-feed">
                {campaignPhotos
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 6)
                  .map((photo) => (
                    <article key={photo.id} className="overflow-hidden rounded-xl border border-border/70 bg-muted/10" data-testid={`campaign-detail-post-${photo.id}`}>
                      <img src={photo.photoUrl} alt={photo.description || campaign.title} className="h-44 w-full object-cover" />
                      <div className="space-y-1 p-3 text-sm">
                        <p className="text-xs text-muted-foreground" data-testid={`campaign-detail-post-date-${photo.id}`}>
                          {new Date(photo.createdAt).toLocaleString(locale)}
                        </p>
                        <p data-testid={`campaign-detail-post-text-${photo.id}`}>{photo.description || t('campaigns.posts.emptyText', 'Оновлення без тексту')}</p>
                      </div>
                    </article>
                  ))}
              </div>
            </CardContent>
          </Card>

          <CampaignPhotoGallery campaignId={campaignId!} />
        </div>

        {/* Sidebar / Receipts */}
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.85)] backdrop-blur-sm" data-testid="campaign-detail-transparency-hub-card">
            <CardContent className="relative p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_38%),radial-gradient(circle_at_bottom_left,hsl(var(--secondary)/0.16),transparent_42%)]" />
              <div className="relative space-y-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-[11px] uppercase tracking-[0.22em] text-primary">
                    {t('campaigns.detail.transparencyHubBadge', 'Transparency hub')}
                  </Badge>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground" data-testid="campaign-detail-transparency-hub-title">
                      {t('campaigns.detail.transparencyHubTitle', 'Чеки та лог пожертв')}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {t('campaigns.detail.transparencyHubDescription', 'Повний реєстр чеків і транзакцій відкривається в правій панелі без переходу зі сторінки збору.')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => openInsightPanel('receipts')}
                    className="group flex w-full items-start justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                    data-testid="campaign-detail-open-insights-receipts-button"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('campaigns.detail.openReceiptsPanel', 'Всі чеки')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('campaigns.detail.openReceiptsPanelHint', 'Відкрити повний список документів збору')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{currentCount}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openInsightPanel('transactions')}
                    className="group flex w-full items-start justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                    data-testid="campaign-detail-open-insights-transactions-button"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('campaigns.feed.openPanel', 'Повний лог')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('campaigns.feed.openPanelHint', 'Відкрити усі надходження з пагінацією')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{transactions?.length ?? 0}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                    </div>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-border bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between" data-testid="campaign-detail-receipts-title">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  {t('campaigns.detail.receiptsTitle', 'Короткий перегляд чеків')}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="campaign-detail-receipts-count">{currentCount}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl px-3"
                    onClick={() => openInsightPanel('receipts')}
                    data-testid="campaign-detail-receipts-open-panel-button"
                  >
                    <Eye className="h-4 w-4" />
                    {t('campaigns.detail.openReceiptsPanelShort', 'Всі')}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.activeReceiptsMetric', 'Публічні')}</p>
                  <p className="mt-1 text-lg font-semibold">{activeReceiptsCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.verifiedReceiptsMetric', 'Підтверджені')}</p>
                  <p className="mt-1 text-lg font-semibold">{verifiedReceiptsCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.documentedReceiptsMetric', 'На чеках')}</p>
                  <p className="mt-1 text-lg font-semibold">{formatCampaignMoney(documentedAmountMinor, locale)}</p>
                </div>
              </div>

              {isReceiptsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-18 w-full rounded-xl" />
                  <Skeleton className="h-18 w-full rounded-xl" />
                </div>
              ) : isReceiptsError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t('campaigns.detail.receiptsLoadError', 'Не вдалося завантажити прикріплені чеки')}
                  </AlertDescription>
                </Alert>
              ) : attachedReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <ReceiptText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-50">
                    {t('campaigns.detail.receiptsEmpty', 'До цього збору ще не додано жодного чеку')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previewReceipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-2xl border border-border/70 bg-background/35 p-3 text-sm shadow-[0_12px_30px_-24px_rgba(15,23,42,0.8)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium">
                            {getReceiptDisplayTitle(receipt)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {receipt.merchantName || receipt.originalFileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCampaignDateTime(receipt.purchaseDateUtc || receipt.createdAt, locale)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCampaignMoney(receipt.totalAmount ?? 0, locale)}
                          </p>
                          <Badge variant={receipt.publicationStatus === ReceiptPublicationStatus.Active ? 'default' : 'outline'}>
                            {receipt.publicationStatus === ReceiptPublicationStatus.Active
                              ? t('campaigns.detail.publicationActive')
                              : t('campaigns.detail.publicationDraft')}
                          </Badge>
                          <Badge variant={receipt.status === ReceiptStatus.StateVerified ? 'secondary' : 'outline'}>
                            {receipt.status === ReceiptStatus.StateVerified
                              ? t('campaigns.detail.verifiedStatus')
                              : t('campaigns.detail.statusFallback', { status: receipt.status })}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`campaign-detail-receipt-menu-trigger-${receipt.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12}>
                              <DropdownMenuItem asChild>
                                <Link to={`/dashboard/${orgId}/receipts/${receipt.id}`} data-testid={`campaign-detail-receipt-open-${receipt.id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                  {t('campaigns.detail.openFullReceipt')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10"
                                onClick={() => void handleDetachReceipt(receipt.id)}
                                disabled={detachReceiptFromCampaign.isPending}
                                data-testid={`campaign-detail-receipt-detach-${receipt.id}`}
                              >
                                {t('campaigns.detail.detachReceipt', 'Відкріпити чек')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                  {hiddenReceiptsCount > 0 ? (
                    <p className="text-xs text-muted-foreground" data-testid="campaign-detail-hidden-receipts-count">
                      {t('campaigns.detail.moreReceipts', { count: hiddenReceiptsCount })}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button size="sm" className="w-full" onClick={() => setIsReceiptDialogOpen(true)} data-testid="campaign-detail-attach-receipt-button">
                  + {t('campaigns.detail.attachReceipt', 'Прикріпити чек')}
                </Button>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={`/dashboard/${orgId}/receipts/new`}>
                    <Plus className="h-4 w-4" />
                    {t('campaigns.detail.newReceipt')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-border bg-card/60 backdrop-blur-sm" data-testid="campaign-detail-donation-feed-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between gap-2" data-testid="campaign-detail-donation-feed-title">
                <div className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-primary" />
                  {t('campaigns.feed.title', 'Лог пожертв')}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl px-3"
                  onClick={() => openInsightPanel('transactions')}
                  data-testid="campaign-detail-donation-feed-open-panel-button"
                >
                  <Eye className="h-4 w-4" />
                  {t('campaigns.feed.openPanelShort', 'Повний')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.pageMetric', 'Сторінка')}</p>
                  <p className="mt-1 text-lg font-semibold">{transactionsPage}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.loadedMetric', 'Записів')}</p>
                  <p className="mt-1 text-lg font-semibold">{transactions?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.amountMetric', 'На сторінці')}</p>
                  <p className="mt-1 text-lg font-semibold">{formatCampaignMoney(transactionsPageTotalAmount, locale)}</p>
                </div>
              </div>

              {isTransactionsLoading ? (
                <div className="space-y-3" data-testid="campaign-detail-donation-feed-loading">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : isTransactionsError ? (
                <Alert variant="destructive" data-testid="campaign-detail-donation-feed-error">
                  <AlertDescription className="space-y-3">
                    <span>{t('campaigns.feed.error', 'Не вдалося завантажити транзакції')}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void refetchTransactions()}
                      data-testid="campaign-detail-donation-feed-retry-button"
                    >
                      {t('common.refresh')}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (transactions?.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground" data-testid="campaign-detail-donation-feed-empty">
                  {t('campaigns.feed.empty', 'Поки немає транзакцій для цього збору')}
                </div>
              ) : (
                <div className="space-y-2" data-testid="campaign-detail-donation-feed-list">
                  {previewTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-border/60 bg-background/35 p-3"
                      data-testid={`campaign-detail-donation-feed-item-${transaction.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium" data-testid={`campaign-detail-donation-feed-description-${transaction.id}`}>
                            {transaction.description || t('campaigns.feed.defaultDescription', 'Поповнення збору')}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`campaign-detail-donation-feed-time-${transaction.id}`}>
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatCampaignDateTime(transaction.transactionTimeUtc, locale)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-success" data-testid={`campaign-detail-donation-feed-amount-${transaction.id}`}>
                            {formatCampaignMoney(transaction.amount, locale)}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`campaign-detail-donation-feed-source-${transaction.id}`}>
                            {transaction.source}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2" data-testid="campaign-detail-donation-feed-pagination">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                    disabled={transactionsPage === 1 || isTransactionsLoading}
                    data-testid="campaign-detail-donation-feed-prev-button"
                  >
                    {t('campaigns.feed.prev', 'Попередня')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setTransactionsPage((prev) => prev + 1)}
                    disabled={!hasNextTransactionsPage || isTransactionsLoading}
                    data-testid="campaign-detail-donation-feed-next-button"
                  >
                    {t('campaigns.feed.next', 'Наступна')}
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground" data-testid="campaign-detail-donation-feed-page-indicator">
                  {t('campaigns.feed.page', { page: transactionsPage })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="campaign-detail-manual-progress-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="campaign-detail-manual-progress-title">
                <Handshake className="h-5 w-5 text-primary" />
                {t('campaigns.manualProgress.title', 'Ручне оновлення прогресу')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {manualUpdateError && (
                <Alert variant="destructive" data-testid="campaign-detail-manual-progress-error-alert">
                  <AlertDescription>{manualUpdateError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="campaign-manual-progress-amount">{t('campaigns.manualProgress.amountLabel', 'Поточна сума (₴)')}</Label>
                <Input
                  id="campaign-manual-progress-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualAmountUah || (campaign.currentAmount / 100).toFixed(2)}
                  onChange={(event) => setManualAmountUah(event.target.value)}
                  data-testid="campaign-detail-manual-progress-amount-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-manual-progress-reason">{t('campaigns.manualProgress.reasonLabel', 'Причина (необов\'язково)')}</Label>
                <Textarea
                  id="campaign-manual-progress-reason"
                  rows={3}
                  value={manualReason}
                  onChange={(event) => setManualReason(event.target.value)}
                  placeholder={t('campaigns.manualProgress.reasonPlaceholder', 'Наприклад: імпорт із зовнішньої виписки')}
                  data-testid="campaign-detail-manual-progress-reason-input"
                />
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => void handleManualProgressUpdate()}
                disabled={updateCampaignBalance.isPending}
                data-testid="campaign-detail-manual-progress-submit-button"
              >
                {updateCampaignBalance.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('campaigns.manualProgress.submit', 'Оновити прогрес')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <SelectReceiptDialog
        open={isReceiptDialogOpen}
        onOpenChange={setIsReceiptDialogOpen}
        organizationId={orgId!}
        campaignId={campaignId!}
        onAttach={handleAttachReceipt}
        isAttaching={attachReceiptToCampaign.isPending}
      />

      <Sheet open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
        <SheetContent
          side="right"
          className="h-dvh w-full gap-0 overflow-hidden border-l border-border/70 bg-background p-0 sm:max-w-xl lg:max-w-2xl"
          data-testid="campaign-detail-insights-sheet"
        >
          <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <SheetHeader className="relative shrink-0 border-b border-border/60 pb-5 pr-12">
              <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-[11px] uppercase tracking-[0.22em] text-primary">
                {t('campaigns.detail.transparencyHubBadge', 'Transparency hub')}
              </Badge>
              <SheetTitle data-testid="campaign-detail-insights-title">
                {t('campaigns.detail.insightsTitle', 'Повний реєстр збору')}
              </SheetTitle>
              <SheetDescription data-testid="campaign-detail-insights-description">
                {t('campaigns.detail.insightsDescription', 'Переглядайте прикріплені чеки й усі надходження, не залишаючи сторінку збору.')}
              </SheetDescription>

              <div className="grid gap-3 pt-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.receiptsTitle', 'Чеки')}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{currentCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.title', 'Лог пожертв')}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{transactions?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.documentedReceiptsMetric', 'На чеках')}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{formatCampaignMoney(documentedAmountMinor, locale)}</p>
                </div>
              </div>
            </SheetHeader>

            <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="shrink-0 px-4 pt-4">
                <div className="grid h-12 w-full grid-cols-2 rounded-2xl border border-border/60 bg-muted p-1" data-testid="campaign-detail-insights-tabs-switcher">
                  <button
                    type="button"
                    onClick={() => setInsightTab('receipts')}
                    className={`h-full w-full min-w-0 rounded-xl border-0 px-4 py-2.5 text-sm font-medium transition ${insightTab === 'receipts'
                      ? 'bg-background text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)]'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="campaign-detail-insights-tab-receipts"
                    aria-pressed={insightTab === 'receipts'}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ReceiptText className="h-4 w-4" />
                      {t('campaigns.detail.receiptsTitle', 'Чеки')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsightTab('transactions')}
                    className={`h-full w-full min-w-0 rounded-xl border-0 px-4 py-2.5 text-sm font-medium transition ${insightTab === 'transactions'
                      ? 'bg-background text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)]'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="campaign-detail-insights-tab-transactions"
                    aria-pressed={insightTab === 'transactions'}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HandCoins className="h-4 w-4" />
                      {t('campaigns.feed.title', 'Лог пожертв')}
                    </span>
                  </button>
                </div>
              </div>

              {insightTab === 'receipts' ? (
                <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4" data-testid="campaign-detail-insights-receipts-panel">
                <div className="grid gap-3 pb-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.activeReceiptsMetric', 'Публічні')}</p>
                    <p className="mt-1 text-lg font-semibold">{activeReceiptsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.verifiedReceiptsMetric', 'Підтверджені')}</p>
                    <p className="mt-1 text-lg font-semibold">{verifiedReceiptsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.detail.documentedReceiptsMetric', 'На чеках')}</p>
                    <p className="mt-1 text-lg font-semibold">{formatCampaignMoney(documentedAmountMinor, locale)}</p>
                  </div>
                </div>

                {isReceiptsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </div>
                ) : isReceiptsError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {t('campaigns.detail.receiptsLoadError', 'Не вдалося завантажити прикріплені чеки')}
                    </AlertDescription>
                  </Alert>
                ) : attachedReceipts.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/40 px-6 py-12 text-center">
                    <div className="space-y-2">
                      <p className="text-base font-medium">{t('campaigns.detail.receiptsEmptyTitle', 'Поки що без чеків')}</p>
                      <p className="text-sm text-muted-foreground">{t('campaigns.detail.receiptsEmpty', 'До цього збору ще не додано жодного чеку')}</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="min-h-0 flex-1 pr-4">
                    <div className="space-y-3 pb-2">
                      {attachedReceipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="rounded-3xl border border-border/70 bg-background/55 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.9)]"
                          data-testid={`campaign-detail-insights-receipt-${receipt.id}`}
                        >
                          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_216px] sm:items-start">
                            <div className="min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-semibold text-foreground">{getReceiptDisplayTitle(receipt)}</h3>
                                <Badge variant={receipt.publicationStatus === ReceiptPublicationStatus.Active ? 'default' : 'outline'}>
                                  {receipt.publicationStatus === ReceiptPublicationStatus.Active
                                    ? t('campaigns.detail.publicationActive')
                                    : t('campaigns.detail.publicationDraft')}
                                </Badge>
                                <Badge variant={receipt.status === ReceiptStatus.StateVerified ? 'secondary' : 'outline'}>
                                  {receipt.status === ReceiptStatus.StateVerified
                                    ? t('campaigns.detail.verifiedStatus')
                                    : t('campaigns.detail.statusFallback', { status: receipt.status })}
                                </Badge>
                              </div>

                              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                <p className="truncate">{receipt.merchantName || receipt.originalFileName}</p>
                                <p>{formatCampaignDateTime(receipt.purchaseDateUtc || receipt.createdAt, locale)}</p>
                              </div>
                            </div>

                            <div className="flex min-h-full flex-col items-start justify-between gap-3 sm:items-end">
                              <p className="text-lg font-semibold text-foreground sm:text-right">
                                {formatCampaignMoney(receipt.totalAmount ?? 0, locale)}
                              </p>
                              <div className="flex w-full flex-col gap-2 sm:items-stretch">
                                <Button asChild size="sm" variant="outline">
                                  <Link to={`/dashboard/${orgId}/receipts/${receipt.id}`} data-testid={`campaign-detail-insights-receipt-open-${receipt.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t('campaigns.detail.openFullReceipt')}
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="justify-start px-0 text-destructive hover:text-destructive sm:justify-center"
                                  onClick={() => void handleDetachReceipt(receipt.id)}
                                  disabled={detachReceiptFromCampaign.isPending}
                                  data-testid={`campaign-detail-insights-receipt-detach-${receipt.id}`}
                                >
                                  {t('campaigns.detail.detachReceipt', 'Відкріпити чек')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="mt-4 shrink-0 grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-2">
                  <Button type="button" onClick={() => setIsReceiptDialogOpen(true)} data-testid="campaign-detail-insights-attach-receipt-button">
                    <Plus className="h-4 w-4" />
                    {t('campaigns.detail.attachReceipt', 'Прикріпити чек')}
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/dashboard/${orgId}/receipts/new`}>
                      <ReceiptText className="h-4 w-4" />
                      {t('campaigns.detail.newReceipt')}
                    </Link>
                  </Button>
                </div>
                </div>
              ) : (
                <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4" data-testid="campaign-detail-insights-transactions-panel">
                <div className="grid gap-3 pb-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.pageMetric', 'Сторінка')}</p>
                    <p className="mt-1 text-lg font-semibold">{transactionsPage}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.loadedMetric', 'Записів')}</p>
                    <p className="mt-1 text-lg font-semibold">{transactions?.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('campaigns.feed.amountMetric', 'На сторінці')}</p>
                    <p className="mt-1 text-lg font-semibold">{formatCampaignMoney(transactionsPageTotalAmount, locale)}</p>
                  </div>
                </div>

                {isTransactionsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </div>
                ) : isTransactionsError ? (
                  <Alert variant="destructive">
                    <AlertDescription className="space-y-3">
                      <span>{t('campaigns.feed.error', 'Не вдалося завантажити транзакції')}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => void refetchTransactions()}
                        data-testid="campaign-detail-insights-transactions-retry-button"
                      >
                        {t('common.refresh')}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (transactions?.length ?? 0) === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/40 px-6 py-12 text-center">
                    <div className="space-y-2">
                      <p className="text-base font-medium">{t('campaigns.feed.emptyTitle', 'Поки що без транзакцій')}</p>
                      <p className="text-sm text-muted-foreground">{t('campaigns.feed.empty', 'Поки немає транзакцій для цього збору')}</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="min-h-0 flex-1 pr-4">
                    <div className="space-y-3 pb-2">
                      {transactions?.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="rounded-3xl border border-border/70 bg-background/55 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.9)]"
                          data-testid={`campaign-detail-insights-transaction-${transaction.id}`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <p className="text-base font-semibold text-foreground">
                                {transaction.description || t('campaigns.feed.defaultDescription', 'Поповнення збору')}
                              </p>
                              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                <p className="flex items-center gap-1.5">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {formatCampaignDateTime(transaction.transactionTimeUtc, locale)}
                                </p>
                                <p>{transaction.source}</p>
                              </div>
                            </div>
                            <p className="text-lg font-semibold text-success">
                              {formatCampaignMoney(transaction.amount, locale)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="mt-4 shrink-0 space-y-2 border-t border-border/60 pt-4" data-testid="campaign-detail-insights-transactions-pagination">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                      disabled={transactionsPage === 1 || isTransactionsLoading}
                    >
                      {t('campaigns.feed.prev', 'Попередня')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTransactionsPage((prev) => prev + 1)}
                      disabled={!hasNextTransactionsPage || isTransactionsLoading}
                    >
                      {t('campaigns.feed.next', 'Наступна')}
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {t('campaigns.feed.page', { page: transactionsPage })}
                  </p>
                </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
