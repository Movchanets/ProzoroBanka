import { Link, useParams } from 'react-router-dom';
import { CalendarDays, FileCheck2, Loader2, ReceiptText, ShieldCheck, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { usePublicReceipt } from '@/hooks/queries/usePublic';
import { ReceiptItemsTable } from '@/components/receipt/ReceiptItemsTable';
import type { ReceiptItem } from '@/types';

export default function PublicReceiptPlaceholderPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('uk') ? 'uk-UA' : 'en-US';
  const { id } = useParams<{ id: string }>();
  const { data: receipt, isLoading, error } = usePublicReceipt(id);

  if (isLoading) {
    return (
      <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-receipt-page">
        <PublicPageToolbar compact />
        <Card className="rounded-4xl border border-border/80">
          <CardContent className="flex min-h-56 items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground" data-testid="public-receipt-loading">{t('receipts.public.loading')}</span>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!receipt || error) {
    return (
      <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-receipt-page">
        <PublicPageToolbar compact />
        <Alert variant="destructive" data-testid="public-receipt-not-found-alert">
          <AlertTitle>{t('receipts.public.notFoundTitle')}</AlertTitle>
          <AlertDescription data-testid="public-receipt-not-found">{t('receipts.public.notFoundDescription')}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const formattedAmount = typeof receipt.totalAmount === 'number'
    ? new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'UAH',
      maximumFractionDigits: 2,
    }).format(receipt.totalAmount)
    : t('common.na');

  const receiptItemsForTable: ReceiptItem[] = (receipt.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    barcode: item.barcode,
    vatRate: item.vatRate,
    vatAmount: item.vatAmount,
    sortOrder: item.sortOrder,
  }));

  const itemPhotos = (receipt.itemPhotos ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const itemNameById = new Map(receiptItemsForTable.map((item) => [item.id, item.name]));

  return (
    <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-receipt-page">
      <PublicPageToolbar compact />

      <section className="overflow-hidden rounded-4xl border border-border/80 bg-card" data-testid="public-receipt-hero">
        <div className="grid gap-0 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="w-fit" data-testid="public-receipt-status-badge">{receipt.status}</Badge>
              {receipt.isConfirmed ? (
                <Badge variant="secondary" className="w-fit" data-testid="public-receipt-confirmed-badge">{t('receipts.public.confirmedBadge')}</Badge>
              ) : null}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight" data-testid="public-receipt-title">{receipt.merchantName || t('receipts.public.titleFallback')}</h1>
            <div className="grid gap-3 sm:grid-cols-3" data-testid="public-receipt-kpis">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('receipts.public.kpiAmount')}</p>
                <p className="mt-1 text-base font-semibold" data-testid="public-receipt-total-amount">{formattedAmount}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('receipts.public.kpiDate')}</p>
                <p className="mt-1 text-sm font-semibold" data-testid="public-receipt-transaction-date">
                  {receipt.transactionDate ? new Date(receipt.transactionDate).toLocaleString(locale) : t('common.na')}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('receipts.public.kpiAddedBy')}</p>
                <p className="mt-1 text-sm font-semibold" data-testid="public-receipt-added-by">{receipt.addedByName || t('common.na')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3" data-testid="public-receipt-links">
              {receipt.organizationSlug ? (
                <Button asChild variant="outline" data-testid="public-receipt-organization-link">
                  <Link to={`/o/${receipt.organizationSlug}`}>
                    <ShieldCheck className="h-4 w-4" />
                    {t('receipts.public.organizationLink')}
                  </Link>
                </Button>
              ) : null}
              {receipt.campaignId ? (
                <Button asChild data-testid="public-receipt-campaign-link">
                  <Link to={`/c/${receipt.campaignId}`}>
                    <ReceiptText className="h-4 w-4" />
                    {t('receipts.public.goToCampaign')}
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" data-testid="public-receipt-home-link">
                <Link to="/">{t('common.home')}</Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-border bg-muted/20 p-4 lg:border-t-0 lg:border-l lg:p-6" data-testid="public-receipt-scan-block">
            <h2 className="mb-3 flex items-center text-sm font-semibold text-foreground">
              <FileCheck2 className="mr-2 h-4 w-4 text-primary" />
              {t('receipts.public.scanTitle')}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-background" data-testid="public-receipt-image-wrap">
              <img
                src={receipt.imageUrl}
                alt={t('receipts.public.scanAlt')}
                className="max-h-140 w-full object-contain"
                data-testid="public-receipt-image"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]" data-testid="public-receipt-main-content">
        <Card className="border-border/80" data-testid="public-receipt-items-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {t('receipts.public.itemsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReceiptItemsTable
              items={receiptItemsForTable}
              testIdPrefix="public-receipt-items"
              emptyMessage={t('receipts.public.itemsEmpty')}
            />

            <div className="mt-5 space-y-3" data-testid="public-receipt-item-photos-block">
              <h3 className="text-sm font-semibold text-foreground">{t('receipts.public.itemPhotosTitle')}</h3>
              {itemPhotos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground" data-testid="public-receipt-item-photos-empty">
                  {t('receipts.public.itemPhotosEmpty')}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="public-receipt-item-photos-grid">
                  {itemPhotos.map((photo, index) => (
                    <article key={photo.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card" data-testid={`public-receipt-item-photo-${index}`}>
                      <div className="aspect-4/3 overflow-hidden border-b border-border/70 bg-muted/20">
                        <img
                          src={photo.photoUrl}
                          alt={photo.originalFileName || t('receipts.public.itemPhotoAlt', { index: index + 1 })}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="truncate text-sm font-medium" title={photo.originalFileName}>{photo.originalFileName}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`public-receipt-item-photo-link-${index}`}>
                          {photo.receiptItemId && itemNameById.get(photo.receiptItemId)
                            ? t('receipts.public.itemPhotoBound', { item: itemNameById.get(photo.receiptItemId) })
                            : photo.receiptItemId
                              ? t('receipts.public.itemPhotoMissingBinding')
                              : t('receipts.public.itemPhotoNoBinding')}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80" data-testid="public-receipt-details-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              {t('receipts.public.detailsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('receipts.public.receiptIdLabel')}</dt>
                <dd className="break-all text-right font-medium" data-testid="public-receipt-id">{receipt.id}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('receipts.public.merchantLabel')}</dt>
                <dd className="text-right font-medium" data-testid="public-receipt-merchant">{receipt.merchantName || t('common.na')}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('receipts.public.taxVerificationLabel')}</dt>
                <dd className="text-right font-medium" data-testid="public-receipt-verification-link">
                  {receipt.verificationUrl ? (
                    <a href={receipt.verificationUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                      {t('common.open')}
                    </a>
                  ) : t('common.na')}
                </dd>
              </div>
            </dl>

          </CardContent>
        </Card>
      </section>
    </main>
  );
}
