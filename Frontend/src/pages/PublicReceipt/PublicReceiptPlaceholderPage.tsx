import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { usePublicReceipt } from '@/hooks/queries/usePublic';
import { ReceiptItemsTable } from '@/components/receipt/ReceiptItemsTable';

export default function PublicReceiptPlaceholderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: receipt, isLoading, error } = usePublicReceipt(id);
  let structuredOutputPretty = 'Немає структурованих OCR-даних для цього чека.';

  if (receipt?.structuredOutputJson) {
    try {
      structuredOutputPretty = JSON.stringify(JSON.parse(receipt.structuredOutputJson), null, 2);
    } catch {
      structuredOutputPretty = receipt.structuredOutputJson;
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-receipt-page">
        <PublicPageToolbar compact />
        <Card className="rounded-4xl border border-border/80">
          <CardContent className="flex min-h-56 items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground" data-testid="public-receipt-loading">Завантаження чека...</span>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!receipt || error) {
    return (
      <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-receipt-page">
        <PublicPageToolbar compact />
        <Card className="rounded-4xl border border-border/80">
          <CardContent className="flex min-h-56 items-center justify-center">
            <p className="text-sm text-muted-foreground" data-testid="public-receipt-not-found">Чек не знайдено або ще не доступний публічно.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-[min(1100px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(1100px,calc(100%-40px))]" data-testid="public-receipt-page">
      <PublicPageToolbar compact />

      <Card className="overflow-hidden rounded-4xl border border-border/80">
        <CardHeader className="space-y-3 bg-[linear-gradient(135deg,hsl(var(--hero-panel)/0.22),transparent_70%)]">
          <Badge variant="outline" className="w-fit" data-testid="public-receipt-status-badge">{receipt.status}</Badge>
          {receipt.isConfirmed ? (
            <Badge variant="secondary" className="w-fit" data-testid="public-receipt-confirmed-badge">Підтверджено</Badge>
          ) : null}
          <CardTitle className="text-2xl" data-testid="public-receipt-title">
            {receipt.merchantName || 'Публічний перегляд чека'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 md:grid-cols-[1.1fr,1fr]">
          <section className="space-y-3" data-testid="public-receipt-scan-block">
            <h2 className="text-base font-semibold text-foreground">Скан чека</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/25">
              <img
                src={receipt.imageUrl}
                alt="Скан чека"
                className="max-h-140 w-full object-contain"
                data-testid="public-receipt-image"
              />
            </div>
          </section>

          <section className="space-y-4">
            <article className="rounded-2xl border border-border bg-card p-4" data-testid="public-receipt-validation-fields">
              <h2 className="text-base font-semibold text-foreground">Поля валідації</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">ID чека</dt>
                  <dd className="font-medium text-foreground" data-testid="public-receipt-id">{receipt.id}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Сума</dt>
                  <dd className="font-medium text-foreground" data-testid="public-receipt-total-amount">
                    {receipt.totalAmount !== undefined
                      ? `${new Intl.NumberFormat('uk-UA').format(receipt.totalAmount)} грн`
                      : 'Н/д'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Дата операції</dt>
                  <dd className="font-medium text-foreground" data-testid="public-receipt-transaction-date">
                    {receipt.transactionDate ? new Date(receipt.transactionDate).toLocaleString('uk-UA') : 'Н/д'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Додано</dt>
                  <dd className="font-medium text-foreground" data-testid="public-receipt-added-by">{receipt.addedByName || 'Н/д'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Перевірка ДПС</dt>
                  <dd className="font-medium text-foreground" data-testid="public-receipt-verification-link">
                    {receipt.verificationUrl ? (
                      <a href={receipt.verificationUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                        Відкрити
                      </a>
                    ) : 'Н/д'}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-border bg-card p-4" data-testid="public-receipt-structured-output">
              <h2 className="text-base font-semibold text-foreground">Structured OCR output</h2>
              <div className="mt-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Позиції товарів</h3>
                <ReceiptItemsTable structuredOutputJson={receipt.structuredOutputJson} testIdPrefix="public-receipt-items" />
              </div>
              <pre className="mt-3 max-h-90 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-foreground whitespace-pre-wrap">
                {structuredOutputPretty}
              </pre>
            </article>

            <div className="flex flex-wrap gap-3" data-testid="public-receipt-links">
              {receipt.organizationSlug ? (
                <Link
                  to={`/o/${receipt.organizationSlug}`}
                  className="inline-flex rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
                  data-testid="public-receipt-organization-link"
                >
                  Організація
                </Link>
              ) : null}
              {receipt.campaignId ? (
                <Link
                  to={`/c/${receipt.campaignId}`}
                  className="inline-flex rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
                  data-testid="public-receipt-campaign-link"
                >
                  Перейти до збору
                </Link>
              ) : null}
              <Link
                to="/"
                className="inline-flex rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
                data-testid="public-receipt-home-link"
              >
                На головну
              </Link>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
