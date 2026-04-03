import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignProgressBar } from '@/components/public/CampaignProgressBar';
import { PublicReceiptCard } from '@/components/public/PublicReceiptCard';
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

export default function PublicCampaignPage() {
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
          <AlertTitle>Не вдалося завантажити збір</AlertTitle>
          <AlertDescription>Перевірте посилання або спробуйте пізніше.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const campaign = campaignQuery.data;
  const receipts = receiptsQuery.data?.items ?? [];

  return (
    <>
      <SeoHelmet
        title={campaignForSeo ? `${campaignForSeo.title}: прогрес, чеки, звіти | ProzoroBanka` : 'Збір | ProzoroBanka'}
        description={campaignForSeo
          ? `${campaignForSeo.title}. Збір від ${campaignForSeo.organizationName} з публічним прогресом та підтвердженими чеками.`
          : 'Публічна сторінка благодійного збору з деталями прогресу та витрат.'}
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
                  name: 'Головна',
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

      <section data-testid="public-campaign-header" className="rounded-4xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Публічний збір</p>
        <h1 className="mt-2 text-3xl font-extrabold text-foreground">{campaign.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link data-testid="public-campaign-org-link" className="inline-flex rounded-xl bg-secondary px-3 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-secondary/90" to={`/o/${campaign.organizationSlug}`}>
            Організація: {campaign.organizationName}
          </Link>
          {campaign.sendUrl ? (
            <a
              href={campaign.sendUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="public-campaign-send-url-link"
              className="inline-flex rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.3)] hover:opacity-95"
            >
              Підтримати збір
            </a>
          ) : null}
        </div>
      </section>

      <CampaignProgressBar currentAmount={campaign.currentAmount} goalAmount={campaign.goalAmount} />

      <Card data-testid="public-campaign-description">
        <CardHeader>
          <CardTitle>Опис збору</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{campaign.description || 'Опис збору поки не додано.'}</p>
          {typeof campaign.daysRemaining === 'number' ? (
            <p className="mt-3 text-sm text-muted-foreground">Залишилось днів: {campaign.daysRemaining}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Підтверджені чеки</CardTitle>
        </CardHeader>
        <CardContent data-testid="public-campaign-receipts-list" className="space-y-3">
          {receiptsQuery.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : null}
          {!receiptsQuery.isLoading && receipts.length === 0 ? (
            <div data-testid="public-campaign-empty-receipts" className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Для цього збору ще немає опублікованих чеків.
            </div>
          ) : null}
          {receipts.map((receipt) => (
            <PublicReceiptCard key={receipt.id} receipt={receipt} />
          ))}
        </CardContent>
      </Card>
      </main>
    </>
  );
}
