import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Eye, FileText, ImageIcon, Newspaper, ShieldCheck, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignProgressBar } from '@/components/public/CampaignProgressBar';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { SeoHelmet } from '@/components/seo/SeoHelmet';
import { usePublicCampaign, usePublicCampaignReceipts } from '@/hooks/queries/usePublic';

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

const campaignPostPlaceholderIds = ['public-post-1', 'public-post-2'] as const;

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

  const campaignQuery = usePublicCampaign(id);
  const receiptsQuery = usePublicCampaignReceipts(id, 1);

  const campaignForSeo = campaignQuery.data;

  if (campaignQuery.isLoading) {
    return <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-6"><Skeleton className="h-72 rounded-4xl" /></div>;
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
  const receipts = receiptsQuery.data?.items ?? [];
  const receiptPreview = receipts.slice(0, 3);
  const hiddenReceiptCount = Math.max(0, receipts.length - receiptPreview.length);

  return (
    <>
      <SeoHelmet
        title={campaignForSeo
          ? t('campaigns.public.seoTitleWithName', { title: campaignForSeo.title })
          : t('campaigns.public.seoTitleFallback')}
        description={campaignForSeo
          ? t('campaigns.public.seoDescriptionWithName', {
            title: campaignForSeo.title,
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
              name: campaignForSeo.title,
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
                  name: campaignForSeo.title,
                  item: buildSiteUrl(`/c/${campaignForSeo.id}`),
                },
              ],
            },
          ]
          : undefined}
      />

      <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
        <PublicPageToolbar compact />

        <section className="overflow-hidden rounded-4xl border border-border bg-card" data-testid="public-campaign-header">
          <div className="grid gap-0 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5 p-6 sm:p-8">
              <Badge variant="outline" data-testid="public-campaign-top-badge">{t('campaigns.public.topBadge')}</Badge>
              <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl" data-testid="public-campaign-title">{campaign.title}</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground" data-testid="public-campaign-description-text">
                {campaign.description || t('campaigns.public.descriptionFallback')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  data-testid="public-campaign-org-link"
                  className="inline-flex items-center rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted/60"
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
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.kpiCollected')}</p>
                  <p className="mt-1 text-base font-semibold" data-testid="public-campaign-current-amount">{formatPublicAmount(campaign.currentAmount, locale, t('common.na'))}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.kpiGoal')}</p>
                  <p className="mt-1 text-base font-semibold" data-testid="public-campaign-goal-amount">{formatPublicAmount(campaign.goalAmount, locale, t('common.na'))}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.kpiReceipts')}</p>
                  <p className="mt-1 text-base font-semibold" data-testid="public-campaign-receipt-count">{receipts.length}</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-72 border-t border-border bg-muted/15 lg:border-t-0 lg:border-l" data-testid="public-campaign-cover">
              {campaign.coverImageUrl ? (
                <img src={campaign.coverImageUrl} alt={campaign.title} className="h-full w-full object-cover" data-testid="public-campaign-cover-image" />
              ) : (
                <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.2),transparent_45%),radial-gradient(circle_at_80%_20%,hsl(var(--secondary)/0.15),transparent_40%)] px-6 text-center" data-testid="public-campaign-cover-placeholder">
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

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card data-testid="public-campaign-posts-card" className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Newspaper className="h-5 w-5 text-primary" />
                {t('campaigns.public.updatesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaignPostPlaceholderIds.map((postId) => (
                <article key={postId} className="rounded-2xl border border-border/70 bg-muted/15 p-4" data-testid={`public-campaign-post-placeholder-${postId}`}>
                  <p className="text-xs text-muted-foreground" data-testid={`public-campaign-post-time-${postId}`}>{t(`campaigns.public.posts.${postId}.publishedAt`)}</p>
                  <h3 className="mt-1 text-base font-semibold" data-testid={`public-campaign-post-title-${postId}`}>{t(`campaigns.public.posts.${postId}.title`)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground" data-testid={`public-campaign-post-text-${postId}`}>{t(`campaigns.public.posts.${postId}.text`)}</p>
                  <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-background/70 text-xs text-muted-foreground" data-testid={`public-campaign-post-image-placeholder-${postId}`}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {t('campaigns.public.postImagePlaceholder')}
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80" data-testid="public-campaign-receipts-card">
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
              {receiptPreview.map((receipt, index) => (
                <article key={receipt.id} className="rounded-2xl border border-border/70 bg-card p-4" data-testid={`public-campaign-receipt-preview-${index}`}>
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
                </article>
              ))}
              {hiddenReceiptCount > 0 ? (
                <p className="text-xs text-muted-foreground" data-testid="public-campaign-more-receipts-note">
                  {t('campaigns.public.moreReceiptsNote', { count: hiddenReceiptCount })}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        {typeof campaign.daysRemaining === 'number' ? (
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground" data-testid="public-campaign-days-remaining">
            <Target className="mr-2 inline h-4 w-4 text-primary" />
            {t('campaigns.public.daysRemaining', { count: campaign.daysRemaining })}
          </div>
        ) : null}
      </main>
    </>
  );
}
