import { useMemo, useState } from 'react';
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
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { useHomeCampaignFeed, useSearchOrganizations } from '@/hooks/queries/usePublic';

type HomeTab = 'campaigns' | 'organizations';
type CampaignFilterStatus = 'all' | 'active' | 'completed';

function mapCampaignStatusLabel(value: CampaignFilterStatus) {
  if (value === 'active') return 'Активні';
  if (value === 'completed') return 'Завершені';
  return 'Усі';
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<HomeTab>('campaigns');
  const [campaignStatus, setCampaignStatus] = useState<CampaignFilterStatus>('all');
  const [campaignVerifiedOnly, setCampaignVerifiedOnly] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const organizationSearch = useSearchOrganizations(query, 1, verifiedOnly, activeOnly);
  const campaignSearch = useHomeCampaignFeed(query, campaignStatus, campaignVerifiedOnly);

  const organizations = useMemo(() => organizationSearch.data?.items ?? [], [organizationSearch.data]);
  const campaigns = useMemo(() => campaignSearch.data ?? [], [campaignSearch.data]);
  const activeCampaignCount = useMemo(
    () => campaigns.filter((campaign) => campaign.status === CampaignStatus.Active).length,
    [campaigns],
  );

  const activeQuery = tab === 'campaigns' ? campaignSearch : organizationSearch;
  const activeItemCount = tab === 'campaigns' ? campaigns.length : organizations.length;
  const emptyText = tab === 'campaigns'
    ? 'Спробуйте інший статус збору або змініть пошуковий запит.'
    : 'Спробуйте змінити фільтри або очистити пошуковий запит.';

  return (
    <main className="mx-auto flex w-[min(1200px,calc(100%-24px))] flex-col gap-6 py-6 sm:w-[min(1200px,calc(100%-40px))]">
      <PublicPageToolbar />

      <section data-testid="home-hero-section" className="relative overflow-hidden rounded-4xl border border-border/80 bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--secondary)/0.24)_0%,transparent_56%),linear-gradient(120deg,hsl(var(--hero-panel))_0%,hsl(var(--hero-panel)/0.92)_100%)] p-6 text-(--hero-panel-foreground) shadow-[0_24px_80px_var(--shadow-soft)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--hero-panel-muted)">ProzoroBanka</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Прозора підтримка для волонтерських команд</h1>
        <p className="mt-3 max-w-2xl text-sm text-(--hero-panel-muted) sm:text-base">
          Публічний каталог зборів та організацій з перевіреним прогресом і відкритою фінансовою прозорістю.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">Зборів у видачі</p>
            <p data-testid="home-kpi-campaigns-count" className="mt-1 text-2xl font-bold text-foreground">{campaigns.length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">Активних зборів</p>
            <p data-testid="home-kpi-active-campaigns-count" className="mt-1 text-2xl font-bold text-foreground">{activeCampaignCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">Режим</p>
            <p data-testid="home-kpi-current-tab" className="mt-1 text-2xl font-bold text-foreground">
              {tab === 'campaigns' ? 'Збори' : 'Організації'}
            </p>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(value) => setTab(value as HomeTab)} data-testid="home-main-tabs" className="gap-4">
        <TabsList data-testid="home-main-tabs-list" className="w-full justify-start rounded-2xl border border-border bg-card p-1">
          <TabsTrigger data-testid="home-main-tab-campaigns" value="campaigns" className="rounded-xl px-4">Збори</TabsTrigger>
          <TabsTrigger data-testid="home-main-tab-organizations" value="organizations" className="rounded-xl px-4">Організації</TabsTrigger>
        </TabsList>

        <section data-testid="home-search-form" className="rounded-3xl border border-border bg-card p-4 sm:p-5">
          <label htmlFor="home-search-input" className="mb-2 block text-sm font-semibold text-foreground">
            {tab === 'campaigns' ? 'Пошук зборів' : 'Пошук організацій'}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="home-search-input"
              data-testid="home-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === 'campaigns' ? 'Назва збору, організації або ключове слово' : 'Введіть назву або slug'}
              aria-label={tab === 'campaigns' ? 'Пошук зборів' : 'Пошук організацій'}
            />
            <Button
              type="button"
              onClick={() => {
                void campaignSearch.refetch();
                void organizationSearch.refetch();
              }}
              data-testid="home-search-submit-button"
            >
              Пошук
            </Button>
          </div>

          {tab === 'campaigns' ? (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Фільтр зборів</p>
                <Select value={campaignStatus} onValueChange={(value) => setCampaignStatus(value as CampaignFilterStatus)}>
                  <SelectTrigger data-testid="home-campaign-status-select" className="w-full">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Усі</SelectItem>
                    <SelectItem value="active">Активні</SelectItem>
                    <SelectItem value="completed">Завершені</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">Обрано: {mapCampaignStatusLabel(campaignStatus)}</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Лише перевірені організації</p>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    data-testid="home-campaign-verified-org-toggle"
                    type="checkbox"
                    checked={campaignVerifiedOnly}
                    onChange={(event) => setCampaignVerifiedOnly(event.target.checked)}
                  />
                  Застосувати до вкладки зборів
                </label>
              </div>

              <ComingSoonStub
                testId="home-coming-soon-campaign-filters"
                title="Розширені фільтри"
                description="Категорії, географія та теги зборів будуть додані на наступному етапі."
              />
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
                Лише верифіковані організації
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  data-testid="home-active-filter-toggle"
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                />
                Лише з активними зборами
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
              {tab === 'campaigns' ? 'Не вдалося завантажити збори' : 'Не вдалося завантажити організації'}
            </AlertTitle>
            <AlertDescription>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void campaignSearch.refetch();
                  void organizationSearch.refetch();
                }}
              >
                Спробувати ще раз
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!activeQuery.isLoading && !activeQuery.isError && activeItemCount === 0 ? (
          <section data-testid="home-empty-state" className="rounded-3xl border border-border bg-card p-6 text-center">
            <h2 className="text-xl font-semibold">Нічого не знайдено</h2>
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
            title="Стрічка оновлень збору"
            description="Незабаром тут з'явиться хронологія витрат і ключових апдейтів по зборах."
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
  );
}
