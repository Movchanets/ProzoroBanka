import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignStatus } from '@/types';
import { OrganizationCard } from '@/components/public/OrganizationCard';
import { CampaignCard } from '@/components/public/CampaignCard';
import { ComingSoonStub } from '@/components/public/ComingSoonStub';
import { useHomeCampaignFeed, usePublicCampaignCategories, useSearchOrganizations } from '@/hooks/queries/usePublic';
import { useTranslation } from 'react-i18next';
import { resolveLocalizedText } from '@/lib/localizedText';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MetaDescriptor } from 'react-router';

type HomeTab = 'campaigns' | 'organizations';
type CampaignFilterStatus = 'all' | 'active' | 'completed';

// eslint-disable-next-line react-refresh/only-export-components
export function meta(): MetaDescriptor[] {
  return [
    { title: 'Прозорі благодійні збори та організації | ProzoroBanka' },
    {
      name: 'description',
      content: 'Платформа публічної фінансової прозорості для волонтерських організацій і благодійних зборів.',
    },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: 'Прозорі благодійні збори та організації | ProzoroBanka' },
    {
      property: 'og:description',
      content: 'Платформа публічної фінансової прозорості для волонтерських організацій і благодійних зборів.',
    },
    { name: 'twitter:card', content: 'summary_large_image' },
  ];
}

function parseHomeTabFromHash(hash: string): HomeTab | null {
  if (hash === '#campaigns') {
    return 'campaigns';
  }

  if (hash === '#organizations') {
    return 'organizations';
  }

  return null;
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<CampaignFilterStatus>('all');
  const [campaignCategorySlug, setCampaignCategorySlug] = useState<string>('all');
  const [campaignVerifiedOnly, setCampaignVerifiedOnly] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const tab = parseHomeTabFromHash(location.hash) ?? 'campaigns';

  const campaignCategoriesQuery = usePublicCampaignCategories(tab === 'campaigns');

  const organizationSearch = useSearchOrganizations(
    deferredQuery,
    1,
    verifiedOnly,
    activeOnly,
    'activeCampaigns',
    12,
    tab === 'organizations',
  );
  const campaignSearch = useHomeCampaignFeed(
    deferredQuery,
    campaignCategorySlug === 'all' ? undefined : campaignCategorySlug,
    campaignStatus,
    campaignVerifiedOnly,
    24,
    tab === 'campaigns',
  );

  const organizations = organizationSearch.data?.items ?? [];
  const campaigns = campaignSearch.data ?? [];
  const activeCampaignCount = campaigns.filter((campaign) => campaign.status === CampaignStatus.Active).length;

  const activeQuery = tab === 'campaigns' ? campaignSearch : organizationSearch;
  const activeItemCount = tab === 'campaigns' ? campaigns.length : organizations.length;
  const emptyText = tab === 'campaigns'
    ? t('home.empty.campaigns')
    : t('home.empty.organizations');

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as HomeTab;

    const targetHash = `#${nextTab}`;
    if (location.hash !== targetHash) {
      navigate({
        pathname: location.pathname,
        search: location.search,
        hash: targetHash,
      }, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!parseHomeTabFromHash(location.hash)) {
      return;
    }

    const target = document.getElementById('home-main-tabs-anchor');
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  return (
    <>
      <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
        
      <section
        data-testid="home-hero-section"
        className="relative overflow-hidden rounded-4xl border border-border/80 p-6 text-foreground shadow-[0_24px_80px_var(--shadow-soft)] sm:p-8"
        style={{
          backgroundImage:
            'radial-gradient(120% 120% at 100% 0%, hsl(var(--secondary) / 0.14) 0%, transparent 56%), var(--hero-surface)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/65">ProzoroBanka</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('home.hero.title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/72 sm:text-base">
          {t('home.hero.description')}
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/25 bg-background/82 p-3 shadow-[0_10px_24px_var(--shadow-soft)] backdrop-blur-sm dark:border-border/70 dark:bg-background/60">
            <p className="text-xs text-foreground/70 dark:text-muted-foreground">{t('home.kpi.campaignsCount')}</p>
            <p data-testid="home-kpi-campaigns-count" className="mt-1 text-2xl font-bold text-foreground">{campaigns.length}</p>
          </div>
          <div className="rounded-2xl border border-white/25 bg-background/82 p-3 shadow-[0_10px_24px_var(--shadow-soft)] backdrop-blur-sm dark:border-border/70 dark:bg-background/60">
            <p className="text-xs text-foreground/70 dark:text-muted-foreground">{t('home.kpi.activeCampaignsCount')}</p>
            <p data-testid="home-kpi-active-campaigns-count" className="mt-1 text-2xl font-bold text-foreground">{activeCampaignCount}</p>
          </div>
          <div className="rounded-2xl border border-white/25 bg-background/82 p-3 shadow-[0_10px_24px_var(--shadow-soft)] backdrop-blur-sm dark:border-border/70 dark:bg-background/60">
            <p className="text-xs text-foreground/70 dark:text-muted-foreground">{t('home.kpi.mode')}</p>
            <p data-testid="home-kpi-current-tab" className="mt-1 text-2xl font-bold text-foreground">
              {tab === 'campaigns' ? t('home.tabs.campaigns') : t('home.tabs.organizations')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card/92 p-5 shadow-[0_16px_40px_var(--shadow-soft)] sm:p-6" data-testid="home-seo-content-section">
        <h2 className="text-2xl font-bold text-foreground">{t('home.seoContent.title')}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {t('home.seoContent.paragraph1')}
        </p>

        <h3 className="mt-5 text-xl font-semibold text-foreground">{t('home.seoContent.subtitle1')}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-muted-foreground">
          <li>{t('home.seoContent.listItem1')}</li>
          <li>{t('home.seoContent.listItem2')}</li>
          <li>{t('home.seoContent.listItem3')}</li>
          <li>{t('home.seoContent.listItem4')}</li>
        </ul>

        <h4 className="mt-5 text-lg font-semibold text-foreground">{t('home.seoContent.subtitle2')}</h4>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {t('home.seoContent.paragraph2')}
        </p>

        <h5 className="mt-5 text-base font-semibold text-foreground">{t('home.seoContent.subtitle3')}</h5>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {t('home.seoContent.paragraph3')}
        </p>

        <h6 className="mt-4 text-sm font-semibold uppercase tracking-wide text-foreground">{t('home.seoContent.subtitle4')}</h6>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          {t('home.seoContent.paragraph4')}
        </p>
      </section>

      <Tabs id="home-main-tabs-anchor" value={tab} onValueChange={handleTabChange} data-testid="home-main-tabs" className="gap-4 scroll-mt-24">
        <TabsList data-testid="home-main-tabs-list" className="w-full justify-start rounded-2xl border border-border/80 bg-card/92 p-1 shadow-[0_10px_24px_var(--shadow-soft)] scroll-mt-24">
          <TabsTrigger id="campaigns" data-testid="home-main-tab-campaigns" value="campaigns" className="rounded-xl px-4 scroll-mt-24">{t('home.tabs.campaigns')}</TabsTrigger>
          <TabsTrigger id="organizations" data-testid="home-main-tab-organizations" value="organizations" className="rounded-xl px-4 scroll-mt-24">{t('home.tabs.organizations')}</TabsTrigger>
        </TabsList>

        <section data-testid="home-search-form" className="rounded-3xl border border-border/80 bg-card/92 p-4 shadow-[0_16px_40px_var(--shadow-soft)] sm:p-5">
          <label htmlFor="home-search-input" className="mb-2 block text-sm font-semibold text-foreground">
            {tab === 'campaigns' ? t('home.search.campaignsLabel') : t('home.search.organizationsLabel')}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="home-search-input"
              data-testid="home-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === 'campaigns' ? t('home.search.campaignsPlaceholder') : t('home.search.organizationsPlaceholder')}
              aria-label={tab === 'campaigns' ? t('home.search.campaignsLabel') : t('home.search.organizationsLabel')}
            />
            <Button
              type="button"
              onClick={() => {
                if (tab === 'campaigns') {
                  void campaignSearch.refetch();
                  return;
                }

                void organizationSearch.refetch();
              }}
              data-testid="home-search-submit-button"
            >
              {t('home.search.submit')}
            </Button>
          </div>

          {tab === 'campaigns' ? (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('home.filters.campaignsTitle')}</p>
                <Select value={campaignStatus} onValueChange={(value) => setCampaignStatus(value as CampaignFilterStatus)}>
                  <SelectTrigger data-testid="home-campaign-status-select" className="w-full">
                    <SelectValue placeholder={t('home.filters.statusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('home.filters.status.all')}</SelectItem>
                    <SelectItem value="active">{t('home.filters.status.active')}</SelectItem>
                    <SelectItem value="completed">{t('home.filters.status.completed')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">{t('home.filters.selectedStatus')}: {t(`home.filters.status.${campaignStatus}`)}</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('home.filters.verifiedOrganizationsOnly')}</p>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    data-testid="home-campaign-verified-org-toggle"
                    type="checkbox"
                    checked={campaignVerifiedOnly}
                    onChange={(event) => setCampaignVerifiedOnly(event.target.checked)}
                  />
                  {t('home.filters.applyToCampaignTab')}
                </label>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('home.filters.categoryTitle')}</p>
                <Select value={campaignCategorySlug} onValueChange={setCampaignCategorySlug}>
                  <SelectTrigger data-testid="home-campaign-category-select" className="w-full">
                    <SelectValue placeholder={t('home.filters.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('home.filters.categoryAll')}</SelectItem>
                    {(campaignCategoriesQuery.data ?? []).map((category) => (
                      <SelectItem value={category.slug} key={category.id}>
                        {resolveLocalizedText(category.nameUk, category.nameEn, i18n.language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  data-testid="home-verified-filter-toggle"
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                />
                {t('home.filters.onlyVerifiedOrganizations')}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  data-testid="home-active-filter-toggle"
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                />
                {t('home.filters.onlyWithActiveCampaigns')}
              </label>
            </div>
          )}
        </section>

        {activeQuery.isLoading ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-64 rounded-3xl" />
            ))}
          </section>
        ) : null}

        {activeQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>
              {tab === 'campaigns' ? t('home.errors.loadCampaigns') : t('home.errors.loadOrganizations')}
            </AlertTitle>
            <AlertDescription>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (tab === 'campaigns') {
                    void campaignSearch.refetch();
                    return;
                  }

                  void organizationSearch.refetch();
                }}
              >
                {t('home.errors.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!activeQuery.isLoading && !activeQuery.isError && activeItemCount === 0 ? (
          <section data-testid="home-empty-state" className="rounded-3xl border border-border/80 bg-card/92 p-6 text-center shadow-[0_16px_40px_var(--shadow-soft)]">
            <h2 className="text-xl font-semibold">{t('home.empty.title')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
          </section>
        ) : null}

        <TabsContent value="campaigns" className="space-y-4" data-testid="home-campaigns-panel">
          <section data-testid="home-campaign-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </section>

          <ComingSoonStub
            testId="home-coming-soon-donations-feed"
            title={t('home.comingSoon.feedTitle')}
            description={t('home.comingSoon.feedDescription')}
          />
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4" data-testid="home-organizations-panel">
          <section data-testid="home-org-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} />
            ))}
          </section>
        </TabsContent>
      </Tabs>
      </main>
    </>
  );
}
