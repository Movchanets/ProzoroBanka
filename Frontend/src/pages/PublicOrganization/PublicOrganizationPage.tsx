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
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { useOrgTransparency, usePublicOrgCampaigns, usePublicOrganization } from '@/hooks/queries/usePublic';
import { resolveLocalizedText } from '@/lib/localizedText';
import { useTranslation } from 'react-i18next';
import type { MetaDescriptor } from 'react-router';
import { publicService } from '@/services/publicService';
import type { PublicOrganization } from '@/types';
import type { LoaderFunctionArgs } from 'react-router';

function mapTabToStatus(tab: 'all' | 'active' | 'completed') {
  if (tab === 'active') return CampaignStatus.Active;
  if (tab === 'completed') return CampaignStatus.Completed;
  return undefined;
}

// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader({ params }: LoaderFunctionArgs) {
  try {
    const organization = await publicService.getOrganization(params.slug!);
    return { organization };
  } catch (error) {
    console.error('Failed to load organization:', error);
    return { organization: null };
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function meta({ data }: { data: { organization: PublicOrganization | null } }): MetaDescriptor[] {
  if (!data?.organization) {
    return [
      { title: 'Організацію не знайдено | ProzoroBanka' },
      { name: 'description', content: 'Цю організацію не знайдено або вона була видалена.' },
    ];
  }

  const { organization } = data;
  const title = organization.name || 'Організація';
  const description = organization.description || 'Профіль організації з перевіркою, активними зборами та публічними показниками прозорості.';

  return [
    { title: `${title} | ProzoroBanka` },
    { name: 'description', content: description },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: `${title} | ProzoroBanka` },
    { property: 'og:description', content: description },
    { property: 'og:image', content: organization.logoUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: `${title} | ProzoroBanka` },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: organization.logoUrl },
  ];
}

export default function PublicOrganizationPage({ loaderData }: { loaderData?: { organization: PublicOrganization | null } }) {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');

  const organizationQuery = usePublicOrganization(slug, { initialData: loaderData?.organization || undefined });
  const campaignsQuery = usePublicOrgCampaigns(slug, mapTabToStatus(tab), 1);
  const transparencyQuery = useOrgTransparency(slug);

  if (organizationQuery.isLoading) {
    return <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-6 sm:w-[min(1200px,calc(100%-40px))]"><Skeleton className="h-72 rounded-4xl shadow-[0_16px_40px_var(--shadow-soft)]" /></div>;
  }

  if (organizationQuery.isError || !organizationQuery.data) {
    return (
      <main className="mx-auto w-[min(1200px,calc(100%-24px))] py-6">
        <Alert variant="destructive">
          <AlertTitle>{t('organizations.public.detail.errorTitle')}</AlertTitle>
          <AlertDescription>{t('organizations.public.detail.errorDescription')}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const org = organizationQuery.data;
  const campaigns = campaignsQuery.data?.items ?? [];

  return (
    <>
      <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
        <Breadcrumbs items={[
          { label: t('common.home'), href: '/' },
          { label: t('home.tabs.organizations'), href: '/#organizations' },
          { label: org.name }
        ]} />

      <section data-testid="public-org-header" className="rounded-4xl border border-border/80 bg-card/92 p-6 shadow-[0_24px_80px_var(--shadow-soft)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-foreground">{org.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{org.description || t('organizations.public.detail.descriptionFallback')}</p>
            {org.website ? (
              <a
                data-testid="public-org-website-link"
                className="mt-3 inline-flex rounded-xl bg-secondary px-3 py-2 text-sm font-semibold !text-white shadow-[0_10px_24px_hsl(216_66%_28%_/_0.18)] transition-colors duration-200 hover:bg-secondary/90"
                href={org.website}
                target="_blank"
                rel="noreferrer"
              >
                {t('organizations.public.detail.websiteLink')}
              </a>
            ) : null}
          </div>
          <VerifiedBadge isVerified={org.isVerified} />
        </div>
      </section>

      <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]">
        <CardHeader>
          <CardTitle>{t('organizations.public.detail.teamTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamAvatarRow members={org.teamMembers} />
        </CardContent>
      </Card>

      {transparencyQuery.data ? <TransparencyChart data={transparencyQuery.data} /> : null}

      <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]">
        <CardHeader className="gap-4">
          <CardTitle>{t('organizations.public.detail.campaignsTitle')}</CardTitle>
          <CampaignTabFilter value={tab} onChange={setTab} />
        </CardHeader>
        <CardContent>
          {campaignsQuery.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : null}

          {!campaignsQuery.isLoading && campaigns.length === 0 ? (
            <div data-testid="public-org-empty-campaigns" className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              {t('organizations.public.detail.campaignsEmpty')}
            </div>
          ) : null}

          {campaigns.length > 0 ? (
            <div data-testid="public-org-campaign-list" className="grid grid-cols-1 gap-3">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/c/${campaign.id}`}
                  data-testid="public-org-campaign-link"
                  className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_24px_var(--shadow-soft)] transition-colors duration-200 hover:bg-muted/50"
                >
                  <p className="font-semibold text-foreground">{resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{campaign.description || t('organizations.public.detail.campaignDescriptionFallback')}</p>
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
