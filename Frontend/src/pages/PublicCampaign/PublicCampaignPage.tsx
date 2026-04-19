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
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { SeoHelmet } from '@/components/seo/SeoHelmet';
import { usePublicCampaign, usePublicCampaignReceipts } from '@/hooks/queries/usePublic';
import { usePublicPurchases } from '@/hooks/queries/usePurchases';
import { resolveLocalizedText } from '@/lib/localizedText';
import { extractTextFromTiptapJson } from '@/lib/tiptapContent';
import { DocumentType } from '@/types';

const ENV_SITE_BASE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '');
const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function resolveSiteBaseUrl(): string {
  if (ENV_SITE_BASE_URL) {
    return ENV_SITE_BASE_URL;
  }

  return LOCALHOST_ORIGIN_REGEX.test(window.location.origin) ? '' : window.location.origin;
}

function buildSiteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return SITE_BASE_URL ? `${SITE_BASE_URL}${normalizedPath}` : normalizedPath;
}

const SITE_BASE_URL = resolveSiteBaseUrl();

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

export default function PublicCampaignPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('uk') ? 'uk-UA' : 'en-US';
  const { id } = useParams<{ id: string }>();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeGalleryImages, setActiveGalleryImages] = useState<PhotoGalleryItem[]>([]);
  const [activeGalleryTitle, setActiveGalleryTitle] = useState('');
  const [activeGalleryDescription, setActiveGalleryDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'updates' | 'receipts' | 'spending'>('updates');

  const campaignQuery = usePublicCampaign(id);
  const receiptsQuery = usePublicCampaignReceipts(id, 1);
  const purchasesQuery = usePublicPurchases(id ?? '', Boolean(id));

  const campaignForSeo = campaignQuery.data;
  const campaignForSeoTitle = campaignForSeo
    ? resolveLocalizedText(campaignForSeo.titleUk, campaignForSeo.titleEn, i18n.language)
    : '';
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
    setActiveGalleryDescription(t('campaigns.public.coverGalleryDescription', 'Галерея обкладинки збору'));
    openGalleryAt(0);
  };

  const openPostGallery = (postId: string, startIndex: number) => {
    const post = posts.find((item) => item.id === postId);
    if (!post || post.images.length === 0) {
      return;
    }

    const textContent = extractTextFromTiptapJson(post.postContentJson, t('campaigns.public.postTextFallback', 'Оновлення без опису'));
    setActiveGalleryImages(
      post.images.map((image) => ({
        src: image.imageUrl,
        alt: textContent,
        caption: textContent,
        richContentJson: post.postContentJson,
      })),
    );
    setActiveGalleryTitle(t('campaigns.public.postGalleryTitle', { id: postId.slice(0, 8) }));
    setActiveGalleryDescription(t('campaigns.public.postGalleryDescription', 'Окрема галерея цього поста'));
    openGalleryAt(startIndex);
  };

  return (
    <>
      <SeoHelmet
        title={campaignForSeo
          ? t('campaigns.public.seoTitleWithName', { title: campaignForSeoTitle })
          : t('campaigns.public.seoTitleFallback')}
        description={campaignForSeo
          ? t('campaigns.public.seoDescriptionWithName', {
            title: campaignForSeoTitle,
            organizationName: campaignForSeo.organizationName,
          })
          : t('campaigns.public.seoDescriptionFallback')}
        canonicalPath={id ? `/c/${id}` : '/c'}
        robots="index,follow"
        jsonLd={campaignForSeo
          ? [
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: campaignForSeoTitle,
              description: campaignForSeo.description,
              url: buildSiteUrl(`/c/${campaignForSeo.id}`),
              isPartOf: {
                '@type': 'WebSite',
                name: 'ProzoroBanka',
                url: SITE_BASE_URL || undefined,
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: t('common.home'),
                  item: buildSiteUrl('/'),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: campaignForSeo.organizationName,
                  item: buildSiteUrl(`/o/${campaignForSeo.organizationSlug}`),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: campaignForSeoTitle,
                  item: buildSiteUrl(`/c/${campaignForSeo.id}`),
                },
              ],
            },
          ]
          : undefined}
      />

      <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
        <PublicPageToolbar compact />

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

            <div className="relative h-[220px] overflow-hidden border-t border-border/80 bg-muted/15 sm:h-[280px] lg:h-[360px] lg:border-t-0 lg:border-l" data-testid="public-campaign-cover">
              {campaign.coverImageUrl ? (
                <button
                  type="button"
                  className="block h-full w-full cursor-pointer"
                  data-testid="public-campaign-cover-open-button"
                  onClick={openCoverGallery}
                  aria-label="Відкрити обкладинку збору"
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
              <TabsTrigger value="spending" data-testid="public-campaign-tab-spending" className="rounded-xl px-4">{t('campaigns.public.spending.title', 'Витрати')}</TabsTrigger>
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
                      {t('campaigns.public.postsEmpty', 'Поки що немає публічних оновлень')}
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {posts.map((post, index) => {
                      const selectedImage = post.images[0];
                      const textContent = extractTextFromTiptapJson(post.postContentJson, t('campaigns.public.postTextFallback', 'Оновлення без опису'));

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
                                aria-label={t('campaigns.public.openPostImage', 'Відкрити фото оновлення')}
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
                  {receipts.map((receipt, index) => (
                    <article key={receipt.id} className="rounded-2xl border border-border/70 bg-card/92 p-4 shadow-[0_10px_24px_var(--shadow-soft)]" data-testid={`public-campaign-receipt-preview-${index}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground" data-testid={`public-campaign-receipt-merchant-${index}`}>{receipt.merchantName || t('campaigns.public.receiptMerchantFallback')}</p>
                          <p className="mt-1 text-sm text-muted-foreground" data-testid={`public-campaign-receipt-amount-${index}`}>{formatPublicAmount(receipt.totalAmount, locale, t('common.na'))}</p>
                          <p className="mt-0.5 flex items-center text-xs text-muted-foreground" data-testid={`public-campaign-receipt-date-${index}`}>
                            <CalendarDays className="mr-1 h-3.5 w-3.5" />
                            {receipt.transactionDate ? new Date(receipt.transactionDate).toLocaleDateString(locale) : t('campaigns.public.receiptDateFallback')}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" data-testid={`public-campaign-receipt-link-${index}`}>
                          <Link to={`/receipt/${receipt.id}`}>
                            <Eye className="h-4 w-4" />
                            {t('campaigns.public.fullReceipt')}
                          </Link>
                        </Button>
                      </div>

                      {receiptDetailQueries[index]?.data?.itemPhotos?.length ? (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" data-testid={`public-campaign-receipt-photos-row-${index}`}>
                          {receiptDetailQueries[index].data.itemPhotos.slice(0, 6).map((photo, photoIndex) => (
                            <Link
                              key={photo.id}
                              to={`/receipt/${receipt.id}`}
                              className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/20 transition-opacity duration-200 hover:opacity-90"
                              data-testid={`public-campaign-receipt-photo-thumb-${index}-${photoIndex}`}
                              aria-label="Відкрити повний чек"
                            >
                              <img src={photo.photoUrl} alt={photo.originalFileName} className="h-full w-full object-cover" />
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spending" data-testid="public-campaign-panel-spending">
              <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]" data-testid="public-campaign-spending-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-xl">
                    <span className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      {t('campaigns.public.spending.title', 'Витрати')}
                    </span>
                    <Badge variant="outline" data-testid="public-campaign-spending-total-badge">
                      {t('campaigns.public.spending.total', 'Разом: {{amount}}', {
                        amount: formatPublicAmount(publicPurchasesTotal / 100, locale, t('common.na')),
                      })}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3" data-testid="public-campaign-spending-list">
                  {purchasesQuery.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : null}
                  {!purchasesQuery.isLoading && publicPurchasesSorted.length === 0 ? (
                    <div data-testid="public-campaign-spending-empty" className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      {t('campaigns.public.spending.empty', 'Поки що немає публічних витрат')}
                    </div>
                  ) : null}

                  {publicPurchasesSorted.map((purchase, index) => {
                    const restrictedDocuments = purchase.documents.filter((document) => document.type === DocumentType.TransferAct).length;
                    const visibleCounterparties = purchase.documents
                      .filter((document) => document.type !== DocumentType.TransferAct)
                      .map((document) => document.counterpartyName)
                      .filter((value): value is string => Boolean(value));

                    return (
                      <article key={purchase.id} className="rounded-2xl border border-border/70 bg-card/92 p-4 shadow-[0_10px_24px_var(--shadow-soft)]" data-testid={`public-campaign-spending-item-${index}`}>
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

                        <div className="mt-2 flex flex-wrap items-center gap-2" data-testid={`public-campaign-spending-doc-summary-${index}`}>
                          <Badge variant="outline">
                            {t('campaigns.public.spending.documentsCount', 'Документів: {{count}}', { count: purchase.documents.length })}
                          </Badge>
                          {visibleCounterparties.length > 0 ? (
                            <Badge variant="secondary" data-testid={`public-campaign-spending-counterparty-${index}`}>
                              {visibleCounterparties[0]}
                            </Badge>
                          ) : null}
                          {restrictedDocuments > 0 ? (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" data-testid={`public-campaign-spending-restricted-${index}`}>
                              {t('campaigns.public.spending.transferActSecured', 'Є захищені Transfer Act документи')}
                            </Badge>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
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
          description={activeGalleryDescription || t('campaigns.public.coverGalleryDescription', 'Галерея обкладинки збору')}
          testIdPrefix="public-campaign-gallery"
        />
      </main>
    </>
  );
}
