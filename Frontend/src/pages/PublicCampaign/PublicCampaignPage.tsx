import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Eye, FileText, ImageIcon, Newspaper, ShieldCheck, Target, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoGalleryDialog, type PhotoGalleryItem } from '@/components/ui/photo-gallery-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignProgressBar } from '@/components/public/CampaignProgressBar';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { CrossLinkingSection } from '@/components/public/CrossLinkingSection';
import { usePublicCampaign, usePublicCampaignReceipts } from '@/hooks/queries/usePublic';
import { usePublicPurchases } from '@/hooks/queries/usePurchases';
import { resolveLocalizedText } from '@/lib/localizedText';
import { extractTextFromTiptapJson } from '@/lib/tiptapContent';
import { DocumentType } from '@/types';
import type { MetaDescriptor } from 'react-router';
import { publicService } from '@/services/publicService';
import type { PublicCampaignDetail } from '@/types';
import type { LoaderFunctionArgs } from 'react-router';

// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader({ params }: LoaderFunctionArgs) {
  try {
    const campaign = await publicService.getCampaign(params.id!);
    return { campaign };
  } catch (error) {
    console.error('Failed to load campaign:', error);
    return { campaign: null };
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function meta({ data }: { data: { campaign: PublicCampaignDetail | null } }): MetaDescriptor[] {
  if (!data?.campaign) {
    return [
      { title: 'Збір не знайдено | ProzoroBanka' },
      { name: 'description', content: 'Цей збір не знайдено або він був видалений.' },
    ];
  }

  const { campaign } = data;
  const title = campaign.titleUk || campaign.titleEn || 'Збір';
  const description = campaign.description || 'Сторінка збору з прогресом, деталями витрат і підтвердженими чеками.';

  return [
    { title: `${title} | ProzoroBanka` },
    { name: 'description', content: description },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: `${title} | ProzoroBanka` },
    { property: 'og:description', content: description },
    { property: 'og:image', content: campaign.coverImageUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: `${title} | ProzoroBanka` },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: campaign.coverImageUrl },
  ];
}

function formatPublicAmount(value: number | undefined, locale: string, emptyText: string) {
  if (typeof value !== 'number') {
    return emptyText;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(value);
}

function getPublicDocumentTypeLabel(type: number, t: (key: string, options?: Record<string, unknown>) => string) {
  switch (type) {
    case DocumentType.BankReceipt:
      return t('purchases.documentTypes.bankReceipt');
    case DocumentType.Waybill:
      return t('purchases.documentTypes.waybill');
    case DocumentType.Invoice:
      return t('purchases.documentTypes.invoice');
    case DocumentType.TransferAct:
      return t('purchases.documentTypes.transferAct');
    default:
      return t('purchases.documentTypes.other');
  }
}

export default function PublicCampaignPage({ loaderData }: { loaderData?: { campaign: PublicCampaignDetail | null } }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('uk') ? 'uk-UA' : 'en-US';
  const { id } = useParams<{ id: string }>();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeGalleryImages, setActiveGalleryImages] = useState<PhotoGalleryItem[]>([]);
  const [activeGalleryTitle, setActiveGalleryTitle] = useState('');
  const [activeGalleryDescription, setActiveGalleryDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'updates' | 'receipts' | 'spending'>('updates');

  const campaignQuery = usePublicCampaign(id, { initialData: loaderData?.campaign || undefined });
  const receiptsQuery = usePublicCampaignReceipts(id, 1);
  const purchasesQuery = usePublicPurchases(id ?? '', Boolean(id));

  const receipts = receiptsQuery.data?.items ?? [];
  const publicPurchases = purchasesQuery.data ?? [];
  const publicPurchasesSorted = [...publicPurchases].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const publicPurchasesTotal = publicPurchases.reduce((accumulator, purchase) => accumulator + purchase.totalAmount, 0);
  const posts = campaignQuery.data?.posts ?? [];

  const receiptDetailQueries = useQueries({
    queries: receipts.map((receipt) => ({
      queryKey: ['public', 'receipt-preview-detail', receipt.id],
      queryFn: () => import('@/services/publicService').then(({ publicService }) => publicService.getReceipt(receipt.id)),
      enabled: Boolean(receipt.id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  if (campaignQuery.isLoading) {
    return <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-6 sm:w-[min(1200px,calc(100%-40px))]"><Skeleton className="h-72 rounded-4xl shadow-[0_16px_40px_var(--shadow-soft)]" /></div>;
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <main className="mx-auto w-[min(1200px,calc(100%-24px))] py-6">
        <Alert variant="destructive">
          <AlertTitle>{t('campaigns.public.errorTitle')}</AlertTitle>
          <AlertDescription>{t('campaigns.public.errorDescription')}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const campaign = campaignQuery.data;
  const campaignTitle = resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language);

  const openGalleryAt = (index: number) => {
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  const openCoverGallery = () => {
    if (!campaign.coverImageUrl) {
      return;
    }

    setActiveGalleryImages([{ src: campaign.coverImageUrl, alt: campaignTitle, caption: campaignTitle }]);
    setActiveGalleryTitle(campaignTitle);
    setActiveGalleryDescription(t('campaigns.public.coverGalleryDescription'));
    openGalleryAt(0);
  };

  const openPostGallery = (postId: string, startIndex: number) => {
    const post = posts.find((item) => item.id === postId);
    if (!post || post.images.length === 0) {
      return;
    }

    const textContent = extractTextFromTiptapJson(post.postContentJson, t('campaigns.public.postTextFallback'));
    setActiveGalleryImages(
      post.images.map((image) => ({
        src: image.imageUrl,
        alt: textContent,
        caption: textContent,
        richContentJson: post.postContentJson,
      })),
    );
    setActiveGalleryTitle(t('campaigns.public.postGalleryTitle', { id: postId.slice(0, 8) }));
    setActiveGalleryDescription(t('campaigns.public.postGalleryDescription'));
    openGalleryAt(startIndex);
  };

  return (
    <>
      <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
        <Breadcrumbs items={[
          { label: t('common.home'), href: '/' },
          { label: campaign.organizationName, href: `/o/${campaign.organizationSlug}` },
          { label: campaignTitle }
        ]} />

        <section className="overflow-hidden rounded-4xl border border-border/80 bg-card/92 shadow-[0_24px_80px_var(--shadow-soft)]" data-testid="public-campaign-header">
          <div className="grid gap-0 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5 p-6 sm:p-8">
              <Badge variant="outline" data-testid="public-campaign-top-badge">{t('campaigns.public.topBadge')}</Badge>
              <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl" data-testid="public-campaign-title">{campaignTitle}</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground" data-testid="public-campaign-description-text">
                {campaign.description || t('campaigns.public.descriptionFallback')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  data-testid="public-campaign-org-link"
                  className="inline-flex items-center rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted/60"
                  to={`/o/${campaign.organizationSlug}`}
                >
                  <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                  {campaign.organizationName}
                </Link>
                {campaign.sendUrl ? (
                  <a
                    href={campaign.sendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="public-campaign-send-url-link"
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-95"
                  >
                    {t('campaigns.public.supportCampaign')}
                  </a>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3" data-testid="public-campaign-kpi-grid">
                <div className="rounded-2xl border border-border/70 bg-background/72 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.kpiCollected')}</p>
                  <p className="mt-1 text-base font-semibold" data-testid="public-campaign-current-amount">{formatPublicAmount(campaign.currentAmount, locale, t('common.na'))}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/72 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.kpiGoal')}</p>
                  <p className="mt-1 text-base font-semibold" data-testid="public-campaign-goal-amount">{formatPublicAmount(campaign.goalAmount, locale, t('common.na'))}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/72 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.kpiReceipts')}</p>
                  <p className="mt-1 text-base font-semibold" data-testid="public-campaign-receipt-count">{receipts.length}</p>
                </div>
              </div>
            </div>

            <div className="relative h-55 overflow-hidden border-t border-border/80 bg-muted/15 sm:h-70 lg:h-90 lg:border-t-0 lg:border-l" data-testid="public-campaign-cover">
              {campaign.coverImageUrl ? (
                <button
                  type="button"
                  className="block h-full w-full cursor-pointer"
                  data-testid="public-campaign-cover-open-button"
                  onClick={openCoverGallery}
                  aria-label={t('campaigns.public.openCoverImage')}
                >
                  <img src={campaign.coverImageUrl} alt={campaignTitle} className="h-full w-full object-cover object-center" data-testid="public-campaign-cover-image" />
                </button>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.2),transparent_45%),radial-gradient(circle_at_80%_20%,hsl(var(--secondary)/0.15),transparent_40%)] px-6 text-center" data-testid="public-campaign-cover-placeholder">
                  <ImageIcon className="h-8 w-8 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{t('campaigns.public.coverPlaceholderTitle')}</p>
                  <p className="max-w-xs text-xs text-muted-foreground">{t('campaigns.public.coverPlaceholderDescription')}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <CampaignProgressBar
          currentAmount={campaign.currentAmount}
          goalAmount={campaign.goalAmount}
          documentedAmount={campaign.documentedAmount}
          documentationPercent={campaign.documentationPercent}
          testId="public-campaign-progress-panel"
        />

        <section>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'updates' | 'receipts' | 'spending')} data-testid="public-campaign-main-tabs" className="gap-4">
            <TabsList data-testid="public-campaign-main-tabs-list" className="w-full justify-start rounded-2xl border border-border/80 bg-card/92 p-1 shadow-[0_10px_24px_var(--shadow-soft)]">
              <TabsTrigger value="updates" data-testid="public-campaign-tab-updates" className="rounded-xl px-4">{t('campaigns.public.updatesTitle')}</TabsTrigger>
              <TabsTrigger value="receipts" data-testid="public-campaign-tab-receipts" className="rounded-xl px-4">{t('campaigns.public.receiptsPreviewTitle')}</TabsTrigger>
              <TabsTrigger value="spending" data-testid="public-campaign-tab-spending" className="rounded-xl px-4">{t('campaigns.public.spending.title')}</TabsTrigger>
            </TabsList>

            <TabsContent value="updates" data-testid="public-campaign-panel-updates">
              <Card data-testid="public-campaign-posts-card" className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Newspaper className="h-5 w-5 text-primary" />
                    {t('campaigns.public.updatesTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground" data-testid="public-campaign-empty-posts">
                      {t('campaigns.public.postsEmpty')}
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {posts.map((post, index) => {
                      const selectedImage = post.images[0];
                      const textContent = extractTextFromTiptapJson(post.postContentJson, t('campaigns.public.postTextFallback'));

                      return (
                        <article key={post.id} className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15 shadow-[0_10px_24px_var(--shadow-soft)]" data-testid={`public-campaign-post-${index}`}>
                          {selectedImage ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  openPostGallery(post.id, 0);
                                }}
                                className="group block w-full cursor-pointer"
                                data-testid={`public-campaign-post-open-button-${index}`}
                                aria-label={t('campaigns.public.openPostImage')}
                              >
                                <img
                                  src={selectedImage.imageUrl}
                                  alt={textContent}
                                  className="h-36 w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.02]"
                                  data-testid={`public-campaign-post-image-${index}`}
                                />
                              </button>
                            </div>
                          ) : null}
                          <div className="space-y-2 p-3">
                            <p className="text-xs text-muted-foreground" data-testid={`public-campaign-post-time-${index}`}>
                              {new Date(post.createdAt).toLocaleString(locale)}
                            </p>
                            <p className="line-clamp-2 text-sm leading-6" data-testid={`public-campaign-post-text-${index}`}>
                              {textContent}
                            </p>
                            {post.images.length > 0 ? (
                              <p className="text-xs text-muted-foreground" data-testid={`public-campaign-post-images-count-${index}`}>
                                {t('campaigns.posts.imagesCount', { count: post.images.length })}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receipts" data-testid="public-campaign-panel-receipts">
              <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]" data-testid="public-campaign-receipts-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-5 w-5 text-primary" />
                    {t('campaigns.public.receiptsPreviewTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3" data-testid="public-campaign-receipts-list">
                  {receiptsQuery.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : null}
                  {!receiptsQuery.isLoading && receipts.length === 0 ? (
                    <div data-testid="public-campaign-empty-receipts" className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      {t('campaigns.public.receiptsEmpty')}
                    </div>
                  ) : null}
                  {receipts.length > 0 ? (
                    <div className="relative ml-4 space-y-6 border-l-2 border-border/60 pl-6">
                      {receipts.map((receipt, index) => (
                        <div key={receipt.id} className="relative">
                          <span className="absolute -left-[31px] top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary ring-4 ring-card" />
                          <article className="rounded-3xl border border-border/70 bg-card/92 p-5 shadow-[0_10px_24px_var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_var(--shadow-soft)]" data-testid={`public-campaign-receipt-preview-${index}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground" data-testid={`public-campaign-receipt-merchant-${index}`}>{receipt.merchantName || t('campaigns.public.receiptMerchantFallback')}</p>
                                <p className="mt-1 text-sm text-muted-foreground" data-testid={`public-campaign-receipt-amount-${index}`}>{formatPublicAmount(receipt.totalAmount, locale, t('common.na'))}</p>
                                <p className="mt-0.5 flex items-center text-xs text-muted-foreground" data-testid={`public-campaign-receipt-date-${index}`}>
                                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                  {receipt.transactionDate ? new Date(receipt.transactionDate).toLocaleDateString(locale) : t('campaigns.public.receiptDateFallback')}
                                </p>
                              </div>
                              <Button asChild variant="outline" size="sm" className="rounded-xl transition-colors hover:bg-primary/10 hover:text-primary" data-testid={`public-campaign-receipt-link-${index}`}>
                                <Link to={`/receipt/${receipt.id}`}>
                                  <Eye className="h-4 w-4" />
                                  {t('campaigns.public.fullReceipt')}
                                </Link>
                              </Button>
                            </div>

                            {receiptDetailQueries[index]?.data?.itemPhotos?.length ? (
                              <div className="mt-4 flex gap-2 overflow-x-auto pb-1" data-testid={`public-campaign-receipt-photos-row-${index}`}>
                                {receiptDetailQueries[index].data.itemPhotos.slice(0, 6).map((photo, photoIndex) => (
                                  <Link
                                    key={photo.id}
                                    to={`/receipt/${receipt.id}`}
                                    className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/20 transition-all duration-200 hover:scale-105 hover:opacity-90"
                                    data-testid={`public-campaign-receipt-photo-thumb-${index}-${photoIndex}`}
                                    aria-label="Відкрити повний чек"
                                  >
                                    <img src={photo.photoUrl} alt={photo.originalFileName} className="h-full w-full object-cover" />
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spending" data-testid="public-campaign-panel-spending">
              <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]" data-testid="public-campaign-spending-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-xl">
                    <span className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      {t('campaigns.public.spending.title')}
                    </span>
                    <Badge variant="outline" data-testid="public-campaign-spending-total-badge">
                      {t('campaigns.public.spending.total', {
                        amount: formatPublicAmount(publicPurchasesTotal / 100, locale, t('common.na')),
                      })}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3" data-testid="public-campaign-spending-list">
                  {purchasesQuery.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : null}
                  {!purchasesQuery.isLoading && publicPurchasesSorted.length === 0 ? (
                    <div data-testid="public-campaign-spending-empty" className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      {t('campaigns.public.spending.empty')}
                    </div>
                  ) : null}

                  {publicPurchasesSorted.length > 0 ? (
                    <div className="relative ml-4 space-y-6 border-l-2 border-border/60 pl-6">
                      {publicPurchasesSorted.map((purchase, index) => {
                        const restrictedDocuments = purchase.documents.filter((document) => document.type === DocumentType.TransferAct).length;
                        const visibleDocuments = purchase.documents.filter((document) => document.type !== DocumentType.TransferAct);
                        const visibleCounterparties = purchase.documents
                          .filter((document) => document.type !== DocumentType.TransferAct)
                          .map((document) => document.counterpartyName)
                          .filter((value): value is string => Boolean(value));

                        return (
                          <div key={purchase.id} className="relative">
                            <span className="absolute -left-[31px] top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary ring-4 ring-card" />
                            <article className="rounded-3xl border border-border/70 bg-card/92 p-5 shadow-[0_10px_24px_var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_var(--shadow-soft)]" data-testid={`public-campaign-spending-item-${index}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="font-semibold text-foreground" data-testid={`public-campaign-spending-title-${index}`}>{purchase.title}</p>
                                  <p className="text-xs text-muted-foreground" data-testid={`public-campaign-spending-date-${index}`}>
                                    {new Date(purchase.createdAt).toLocaleDateString(locale)}
                                  </p>
                                </div>
                                <p className="font-semibold" data-testid={`public-campaign-spending-amount-${index}`}>
                                  {formatPublicAmount(purchase.totalAmount / 100, locale, t('common.na'))}
                                </p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2" data-testid={`public-campaign-spending-doc-summary-${index}`}>
                                <Badge variant="outline" className="border-border/60">
                                  {t('campaigns.public.spending.documentsCount', { count: purchase.documents.length })}
                                </Badge>
                                {visibleCounterparties.length > 0 ? (
                                  <Badge variant="secondary" data-testid={`public-campaign-spending-counterparty-${index}`}>
                                    {visibleCounterparties[0]}
                                  </Badge>
                                ) : null}
                                {restrictedDocuments > 0 ? (
                                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" data-testid={`public-campaign-spending-restricted-${index}`}>
                                    {t('campaigns.public.spending.transferActSecured')}
                                  </Badge>
                                ) : null}
                              </div>

                              {visibleDocuments.length === 0 ? (
                                <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground" data-testid={`public-campaign-spending-no-visible-docs-${index}`}>
                                  {t('campaigns.public.spending.noVisibleDocuments')}
                                </div>
                              ) : (
                                <div className="mt-4 space-y-2" data-testid={`public-campaign-spending-documents-${index}`}>
                                  {visibleDocuments.map((document, documentIndex) => {
                                    const documentAmount = document.amount === null ? undefined : document.amount / 100;
                                    const documentDateLabel = document.documentDate
                                      ? new Date(document.documentDate).toLocaleDateString(locale)
                                      : t('campaigns.public.receiptDateFallback');
                                    const documentName = document.originalFileName || t('campaigns.public.spending.documentFallbackName');

                                    return (
                                      <div
                                        key={document.id}
                                        className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm transition-shadow hover:shadow-md"
                                        data-testid={`public-campaign-spending-document-${index}-${documentIndex}`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <Badge variant="outline" data-testid={`public-campaign-spending-document-type-${index}-${documentIndex}`}>
                                                {getPublicDocumentTypeLabel(document.type, t)}
                                              </Badge>
                                              {document.items?.length ? (
                                                <Badge variant="secondary" data-testid={`public-campaign-spending-document-items-count-${index}-${documentIndex}`}>
                                                  {t('campaigns.public.spending.itemsCount', { count: document.items.length })}
                                                </Badge>
                                              ) : null}
                                            </div>
                                            <p className="truncate text-sm font-semibold text-foreground" data-testid={`public-campaign-spending-document-name-${index}-${documentIndex}`}>
                                              {documentName}
                                            </p>
                                            <p className="text-xs text-muted-foreground" data-testid={`public-campaign-spending-document-counterparty-${index}-${documentIndex}`}>
                                              {document.counterpartyName || t('campaigns.public.spending.counterpartyFallback')}
                                            </p>
                                            <p className="text-xs text-muted-foreground" data-testid={`public-campaign-spending-document-date-${index}-${documentIndex}`}>
                                              {documentDateLabel}
                                            </p>
                                          </div>
                                          <div className="flex shrink-0 flex-col items-end gap-2">
                                            <p className="text-sm font-semibold" data-testid={`public-campaign-spending-document-amount-${index}-${documentIndex}`}>
                                              {formatPublicAmount(documentAmount, locale, t('common.na'))}
                                            </p>
                                            {document.fileUrl ? (
                                              <Button asChild variant="outline" size="sm" data-testid={`public-campaign-spending-document-open-${index}-${documentIndex}`}>
                                                <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                                                  <Eye className="h-4 w-4" />
                                                  {t('campaigns.public.spending.openDocument')}
                                                </a>
                                              </Button>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="mt-4 flex justify-end">
                                <Button asChild variant="outline" size="sm" className="rounded-xl transition-colors hover:bg-primary/10 hover:text-primary" data-testid={`public-campaign-spending-open-full-${index}`}>
                                  <Link to={`/spending/${purchase.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t('campaigns.public.spending.viewFullExpense')}
                                  </Link>
                                </Button>
                              </div>
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {typeof campaign.daysRemaining === 'number' ? (
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground shadow-[0_10px_24px_var(--shadow-soft)]" data-testid="public-campaign-days-remaining">
            <Target className="mr-2 inline h-4 w-4 text-primary" />
            {t('campaigns.public.daysRemaining', { count: campaign.daysRemaining })}
          </div>
        ) : null}

        <PhotoGalleryDialog
          images={activeGalleryImages}
          open={isGalleryOpen}
          onOpenChange={setIsGalleryOpen}
          currentIndex={galleryIndex}
          onIndexChange={setGalleryIndex}
          title={activeGalleryTitle || campaignTitle}
          description={activeGalleryDescription || t('campaigns.public.coverGalleryDescription')}
          testIdPrefix="public-campaign-gallery"
        />

        <CrossLinkingSection currentCampaignId={campaign.id} />
      </main>
    </>
  );
}
