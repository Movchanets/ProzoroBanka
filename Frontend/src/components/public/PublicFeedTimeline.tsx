import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, FileText, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TiptapContentView } from '@/components/campaigns/TiptapContentView';
import { usePublicFeed } from '@/hooks/queries/usePublic';
import type { CampaignFeedItemType } from '@/types';

function formatAmount(value: number | undefined, locale: string) {
  if (typeof value !== 'number') return null;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getItemIcon(type: CampaignFeedItemType) {
  switch (type) {
    case 'post':
      return <FileText className="h-4 w-4" />;
    case 'purchase':
      return <Wallet className="h-4 w-4" />;
    case 'transaction':
      return <CalendarDays className="h-4 w-4" />;
  }
}

function getItemColor(type: CampaignFeedItemType) {
  switch (type) {
    case 'post':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    case 'purchase':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
    case 'transaction':
      return 'bg-green-500/15 text-green-600 dark:text-green-400';
  }
}

function getItemTypeLabel(type: CampaignFeedItemType, t: (key: string) => string) {
  switch (type) {
    case 'post':
      return t('campaigns.feedTimeline.typePost');
    case 'purchase':
      return t('campaigns.feedTimeline.typePurchase');
    case 'transaction':
      return t('campaigns.feedTimeline.typeTransaction');
  }
}

export function PublicFeedTimeline() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US';
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError } = usePublicFeed(page, pageSize);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="public-feed-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative ml-4 pl-8">
            <Skeleton className="absolute -left-[31px] top-5 h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-dashed border-destructive/40 p-5 text-sm text-destructive" data-testid="public-feed-error">
        {t('campaigns.feedTimeline.error')}
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = page * pageSize < totalCount;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground" data-testid="public-feed-empty">
        {t('campaigns.feedTimeline.empty')}
      </div>
    );
  }

  return (
    <div data-testid="public-feed">
      <div className="relative ml-4 space-y-6 border-l-2 border-border/60 pl-6">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="relative" data-testid={`public-feed-item-${item.type}-${item.id}`}>
            {/* Timeline dot */}
            <span
              className={`absolute -left-[31px] top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-card ${getItemColor(item.type)}`}
            >
              {getItemIcon(item.type)}
            </span>

            {/* Card */}
            <article className="rounded-2xl border border-border/70 bg-card/92 p-4 shadow-[0_10px_24px_var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_var(--shadow-soft)]">
              {/* Header */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={`text-[10px] ${getItemColor(item.type)}`}>
                    {getItemTypeLabel(item.type, t)}
                  </Badge>
                  {item.campaignId && item.campaignTitle && (
                    <Link
                      to={`/c/${item.campaignId}`}
                      className="text-xs font-medium text-primary hover:underline"
                      data-testid={`public-feed-campaign-link-${item.id}`}
                    >
                      {item.campaignTitle}
                    </Link>
                  )}
                  {item.createdByName && (
                    <span className="text-xs text-muted-foreground">{item.createdByName}</span>
                  )}
                </div>
                <time className="text-xs text-muted-foreground shrink-0" dateTime={item.eventDate}>
                  {formatDate(item.eventDate, locale)}
                </time>
              </div>

              {/* Content by type */}
              {item.type === 'post' && (
                <div className="space-y-2">
                  {item.images && item.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {item.images.map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt={img.originalFileName}
                          className="h-24 w-24 rounded-lg object-cover ring-1 ring-border/50"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                  <TiptapContentView
                    contentJson={item.postContentJson}
                    fallbackText={t('campaigns.public.postTextFallback')}
                    testId={`public-feed-post-content-${item.id}`}
                  />
                </div>
              )}

              {item.type === 'purchase' && (
                <div className="space-y-1">
                  {item.title && <p className="text-sm font-medium text-foreground">{item.title}</p>}
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  {formatAmount(item.amount, locale) && (
                    <p className="text-sm font-semibold text-foreground">{formatAmount(item.amount, locale)}</p>
                  )}
                </div>
              )}

              {item.type === 'transaction' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {formatAmount(item.amount, locale) && (
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">+{formatAmount(item.amount, locale)}</p>
                    )}
                    {item.source && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.source === 'MonobankWebhook' ? 'Monobank' : t('campaigns.feedTimeline.sourceManual')}
                      </Badge>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                </div>
              )}
            </article>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            data-testid="public-feed-load-more"
          >
            {t('campaigns.feedTimeline.loadMore')}
          </Button>
        </div>
      )}

      {/* Counter */}
      <div className="mt-4 text-center text-xs text-muted-foreground" data-testid="public-feed-counter">
        {t('campaigns.feedTimeline.showing', { shown: items.length, total: totalCount })}
      </div>
    </div>
  );
}
