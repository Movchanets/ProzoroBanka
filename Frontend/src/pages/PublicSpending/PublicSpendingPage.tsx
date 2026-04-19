import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Eye, FileText, Loader2, ReceiptText, ShieldCheck, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { usePublicPurchaseById } from '@/hooks/queries/usePurchases';
import { DocumentType, PurchaseStatus } from '@/types';

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

function getPurchaseStatusLabel(status: number, t: (key: string, options?: Record<string, unknown>) => string) {
  switch (status) {
    case PurchaseStatus.PaymentSent:
      return t('purchases.status.paymentSent');
    case PurchaseStatus.PartiallyReceived:
      return t('purchases.status.partiallyReceived');
    case PurchaseStatus.Completed:
      return t('purchases.status.completed');
    case PurchaseStatus.Cancelled:
      return t('purchases.status.cancelled');
    default:
      return t('purchases.status.fallback', { status });
  }
}

export default function PublicSpendingPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('uk') ? 'uk-UA' : 'en-US';
  const { id } = useParams<{ id: string }>();

  const purchaseQuery = usePublicPurchaseById(id ?? '', Boolean(id));
  const purchase = purchaseQuery.data;

  if (purchaseQuery.isLoading) {
    return (
      <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-spending-page">
        <PublicPageToolbar compact />
        <Card className="rounded-4xl border border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]">
          <CardContent className="flex min-h-56 items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground" data-testid="public-spending-loading">{t('campaigns.public.spending.loading')}</span>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!purchase || purchaseQuery.isError) {
    return (
      <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-spending-page">
        <PublicPageToolbar compact />
        <Alert variant="destructive" data-testid="public-spending-not-found-alert">
          <AlertTitle>{t('campaigns.public.spending.notFoundTitle')}</AlertTitle>
          <AlertDescription data-testid="public-spending-not-found">{t('campaigns.public.spending.notFoundDescription')}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const visibleDocuments = purchase.documents.filter((document) => document.type !== DocumentType.TransferAct);
  const restrictedDocuments = purchase.documents.length - visibleDocuments.length;
  const purchaseAmount = formatPublicAmount(purchase.totalAmount / 100, locale, t('common.na'));

  return (
    <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-spending-page">
      <PublicPageToolbar compact />

      <section className="overflow-hidden rounded-4xl border border-border/80 bg-card/92 shadow-[0_24px_80px_var(--shadow-soft)]" data-testid="public-spending-hero">
        <div className="grid gap-0 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" data-testid="public-spending-status-badge">{getPurchaseStatusLabel(purchase.status, t)}</Badge>
              {restrictedDocuments > 0 ? (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" data-testid="public-spending-restricted-badge">
                  {t('campaigns.public.spending.transferActSecured')}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight" data-testid="public-spending-title">{purchase.title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground" data-testid="public-spending-description">
              {purchase.description || t('campaigns.public.spending.fullPageDescription')}
            </p>

            <div className="grid gap-3 sm:grid-cols-3" data-testid="public-spending-kpis">
              <div className="rounded-2xl border border-border/70 bg-background/72 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.spending.totalAmountKpi')}</p>
                <p className="mt-1 text-base font-semibold" data-testid="public-spending-total-amount">{purchaseAmount}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/72 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.spending.documentsCountKpi')}</p>
                <p className="mt-1 text-base font-semibold" data-testid="public-spending-documents-count">{purchase.documents.length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/72 p-3 shadow-[0_10px_24px_var(--shadow-soft)]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('campaigns.public.spending.createdAtKpi')}</p>
                <p className="mt-1 text-sm font-semibold" data-testid="public-spending-created-at">{new Date(purchase.createdAt).toLocaleDateString(locale)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3" data-testid="public-spending-links">
              {purchase.campaignId ? (
                <Button asChild data-testid="public-spending-campaign-link">
                  <Link to={`/c/${purchase.campaignId}`}>
                    <ReceiptText className="h-4 w-4" />
                    {t('campaigns.public.spending.backToCampaign')}
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" data-testid="public-spending-home-link">
                <Link to="/">
                  <ShieldCheck className="h-4 w-4" />
                  {t('common.home')}
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-border/80 bg-muted/20 p-4 lg:border-t-0 lg:border-l lg:p-6" data-testid="public-spending-summary-block">
            <h2 className="mb-3 flex items-center text-sm font-semibold text-foreground">
              <Wallet className="mr-2 h-4 w-4 text-primary" />
              {t('campaigns.public.spending.fullPageSummaryTitle')}
            </h2>
            <div className="space-y-2 rounded-2xl border border-border/80 bg-background p-4 shadow-[0_10px_24px_var(--shadow-soft)]">
              <p className="text-sm font-medium text-foreground" data-testid="public-spending-summary-title">{purchase.title}</p>
              <p className="text-xs text-muted-foreground" data-testid="public-spending-summary-created-at">
                {new Date(purchase.createdAt).toLocaleString(locale)}
              </p>
              <p className="text-base font-semibold" data-testid="public-spending-summary-total">{purchaseAmount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]" data-testid="public-spending-main-content">
        <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]" data-testid="public-spending-documents-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('campaigns.public.spending.documentsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" data-testid="public-spending-documents-list">
            {visibleDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground" data-testid="public-spending-documents-empty">
                {t('campaigns.public.spending.noVisibleDocuments')}
              </div>
            ) : null}

            {visibleDocuments.map((document, index) => {
              const documentAmount = document.amount === null ? undefined : document.amount / 100;
              return (
                <article
                  key={document.id}
                  className="rounded-2xl border border-border/70 bg-card/92 p-4 shadow-[0_10px_24px_var(--shadow-soft)]"
                  data-testid={`public-spending-document-${index}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" data-testid={`public-spending-document-type-${index}`}>
                          {getPublicDocumentTypeLabel(document.type, t)}
                        </Badge>
                        {document.items?.length ? (
                          <Badge variant="secondary" data-testid={`public-spending-document-items-${index}`}>
                            {t('campaigns.public.spending.itemsCount', { count: document.items.length })}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 font-semibold text-foreground" data-testid={`public-spending-document-name-${index}`}>
                        {document.originalFileName || t('campaigns.public.spending.documentFallbackName')}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground" data-testid={`public-spending-document-counterparty-${index}`}>
                        {document.counterpartyName || t('campaigns.public.spending.counterpartyFallback')}
                      </p>
                      <p className="mt-0.5 flex items-center text-xs text-muted-foreground" data-testid={`public-spending-document-date-${index}`}>
                        <CalendarDays className="mr-1 h-3.5 w-3.5" />
                        {document.documentDate ? new Date(document.documentDate).toLocaleDateString(locale) : t('campaigns.public.receiptDateFallback')}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold" data-testid={`public-spending-document-amount-${index}`}>
                        {formatPublicAmount(documentAmount, locale, t('common.na'))}
                      </p>
                      {document.fileUrl ? (
                        <Button asChild variant="outline" size="sm" data-testid={`public-spending-document-open-${index}`}>
                          <a href={document.fileUrl} target="_blank" rel="noreferrer">
                            <Eye className="h-4 w-4" />
                            {t('campaigns.public.spending.openDocument')}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/92 shadow-[0_16px_40px_var(--shadow-soft)]" data-testid="public-spending-details-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="h-5 w-5 text-primary" />
              {t('campaigns.public.spending.detailsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('campaigns.public.spending.purchaseIdLabel')}</dt>
                <dd className="break-all text-right font-medium" data-testid="public-spending-id">{purchase.id}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('campaigns.public.spending.statusLabel')}</dt>
                <dd className="text-right font-medium" data-testid="public-spending-status">{getPurchaseStatusLabel(purchase.status, t)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('campaigns.public.spending.totalLabel')}</dt>
                <dd className="text-right font-medium" data-testid="public-spending-total">{purchaseAmount}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('campaigns.public.spending.createdAtLabel')}</dt>
                <dd className="text-right font-medium" data-testid="public-spending-created">{new Date(purchase.createdAt).toLocaleString(locale)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
