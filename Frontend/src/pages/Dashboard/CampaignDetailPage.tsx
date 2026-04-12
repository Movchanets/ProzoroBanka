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
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CampaignProgressBar } from '@/components/public/CampaignProgressBar';
import { ArrowLeft, Calendar, Edit2, Megaphone, ReceiptText, HandCoins, Clock3, Handshake, Loader2, Plus, ImageIcon, Eye, MoreVertical, Newspaper } from 'lucide-react';
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
  const hasNextTransactionsPage = (transactions?.length ?? 0) === transactionsPageSize;

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
    <div className="mx-auto max-w-4xl space-y-6" data-testid="campaign-detail-page">
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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
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
                  documentedAmount={campaign.documentedAmount / 100}
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
        <div className="space-y-6">
          <Card className="border border-border bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between" data-testid="campaign-detail-receipts-title">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  {t('campaigns.detail.receiptsTitle', 'Короткий перегляд чеків')}
                </div>
                <Badge variant="secondary" data-testid="campaign-detail-receipts-count">{currentCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
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
                    <div key={receipt.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium">
                            {receipt.alias || receipt.merchantName || receipt.originalFileName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {receipt.merchantName || receipt.originalFileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCampaignMoney(receipt.totalAmount ?? 0, locale)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
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

          <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="campaign-detail-donation-feed-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="campaign-detail-donation-feed-title">
                <HandCoins className="h-5 w-5 text-primary" />
                {t('campaigns.feed.title', 'Лог пожертв')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  {transactions?.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3"
                      data-testid={`campaign-detail-donation-feed-item-${transaction.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium" data-testid={`campaign-detail-donation-feed-description-${transaction.id}`}>
                            {transaction.description || t('campaigns.feed.defaultDescription', 'Поповнення збору')}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`campaign-detail-donation-feed-time-${transaction.id}`}>
                            <Clock3 className="h-3.5 w-3.5" />
                            {new Date(transaction.transactionTimeUtc).toLocaleString(locale)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-success" data-testid={`campaign-detail-donation-feed-amount-${transaction.id}`}>
                            {new Intl.NumberFormat(locale).format(transaction.amount / 100)} ₴
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
    </div>
  );
}
