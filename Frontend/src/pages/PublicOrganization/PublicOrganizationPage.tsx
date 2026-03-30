import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/public/VerifiedBadge';
import { TeamAvatarRow } from '@/components/public/TeamAvatarRow';
import { CampaignStatus } from '@/types';
import { CampaignTabFilter } from '@/components/public/CampaignTabFilter';
import { TransparencyChart } from '@/components/public/TransparencyChart';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { SeoHelmet } from '@/components/seo/SeoHelmet';
import { useOrgTransparency, usePublicOrgCampaigns, usePublicOrganization } from '@/hooks/queries/usePublic';

function mapTabToStatus(tab: 'all' | 'active' | 'completed') {
  if (tab === 'active') return CampaignStatus.Active;
  if (tab === 'completed') return CampaignStatus.Completed;
  return undefined;
}

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

export default function PublicOrganizationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');

  const organizationQuery = usePublicOrganization(slug);
  const campaignsQuery = usePublicOrgCampaigns(slug, mapTabToStatus(tab), 1);
  const transparencyQuery = useOrgTransparency(slug);

  const organizationForSeo = organizationQuery.data;

  if (organizationQuery.isLoading) {
    return <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-6"><Skeleton className="h-72 rounded-4xl" /></div>;
  }

  if (organizationQuery.isError || !organizationQuery.data) {
    return (
      <main className="mx-auto w-[min(1200px,calc(100%-24px))] py-6">
        <Alert variant="destructive">
          <AlertTitle>Не вдалося завантажити організацію</AlertTitle>
          <AlertDescription>Перевірте посилання або спробуйте пізніше.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const org = organizationQuery.data;
  const campaigns = campaignsQuery.data?.items ?? [];

  return (
    <>
      <SeoHelmet
        title={organizationForSeo ? `${organizationForSeo.name}: прозорість, звіти, збори | ProzoroBanka` : 'Організація | ProzoroBanka'}
        description={organizationForSeo
          ? `${organizationForSeo.name}. ${organizationForSeo.description ?? 'Публічний профіль організації'} Перевірка, активні збори та прозора звітність.`
          : 'Профіль волонтерської організації з відкритими показниками прозорості і переліком зборів.'}
        canonicalPath={slug ? `/o/${slug}` : '/o'}
        robots="index,follow"
        jsonLd={organizationForSeo
          ? [
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: organizationForSeo.name,
              url: buildSiteUrl(`/o/${organizationForSeo.slug}`),
              description: organizationForSeo.description,
              sameAs: organizationForSeo.website ? [organizationForSeo.website] : undefined,
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
                  name: organizationForSeo.name,
                  item: buildSiteUrl(`/o/${organizationForSeo.slug}`),
                },
              ],
            },
          ]
          : undefined}
      />

      <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
        <PublicPageToolbar compact />

      <section data-testid="public-org-header" className="rounded-4xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">{org.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{org.description || 'Опис організації поки відсутній.'}</p>
            {org.website ? (
              <a
                data-testid="public-org-website-link"
                className="mt-3 inline-flex rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90"
                href={org.website}
                target="_blank"
                rel="noreferrer"
              >
                Вебсайт організації
              </a>
            ) : null}
          </div>
          <VerifiedBadge isVerified={org.isVerified} />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Команда</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamAvatarRow members={org.teamMembers} />
        </CardContent>
      </Card>

      {transparencyQuery.data ? <TransparencyChart data={transparencyQuery.data} /> : null}

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>Збори</CardTitle>
          <CampaignTabFilter value={tab} onChange={setTab} />
        </CardHeader>
        <CardContent>
          {campaignsQuery.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

          {!campaignsQuery.isLoading && campaigns.length === 0 ? (
            <div data-testid="public-org-empty-campaigns" className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              У цієї організації ще немає зборів у вибраному статусі.
            </div>
          ) : null}

          {campaigns.length > 0 ? (
            <div data-testid="public-org-campaign-list" className="grid grid-cols-1 gap-3">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/c/${campaign.id}`}
                  data-testid="public-org-campaign-link"
                  className="rounded-2xl border border-border bg-card p-4 hover:bg-muted/50"
                >
                  <p className="font-semibold text-foreground">{campaign.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{campaign.description || 'Без опису'}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
      </main>
    </>
  );
}
