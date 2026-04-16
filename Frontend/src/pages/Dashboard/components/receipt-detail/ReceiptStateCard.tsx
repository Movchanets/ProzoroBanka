import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ReceiptPipeline } from '@/types';

interface ReceiptStateCardProps {
  receipt: ReceiptPipeline | null;
  locale: string;
  orgId?: string;
  isPendingOcr: boolean;
  hasOcrChanges: boolean;
  statusLabelKeyMap: Record<number, string>;
  publicationLabelKeyMap: Record<number, string>;
  onOpenCampaign: (campaignId: string) => void;
}

function parseReceiptLocalDate(value: string) {
  const isoLikeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoLikeMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoLikeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? '0'),
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatAmount(value: number | undefined, locale: string, fallback: string) {
  if (typeof value !== 'number') return fallback;
  const hryvnias = value / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(hryvnias);
}

function formatDate(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = parseReceiptLocalDate(value);
  if (!date) return fallback;

  return date.toLocaleString(locale);
}

export function ReceiptStateCard({
  receipt,
  locale,
  orgId,
  isPendingOcr,
  hasOcrChanges,
  statusLabelKeyMap,
  publicationLabelKeyMap,
  onOpenCampaign,
}: ReceiptStateCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-state-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          {t('receipts.detail.state.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {receipt ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge data-testid="dashboard-receipts-status-badge" className="flex items-center gap-1.5">
                {isPendingOcr ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {statusLabelKeyMap[receipt.status]
                  ? t(`receipts.detail.status.${statusLabelKeyMap[receipt.status]}`)
                  : t('receipts.detail.status.fallback', { status: receipt.status })}
              </Badge>
              {isPendingOcr ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  data-testid="dashboard-receipts-pending-loader"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('receipts.detail.state.pendingOcrHint')}
                </span>
              ) : null}
              {receipt.isConfirmed ? (
                <Badge variant="secondary" data-testid="dashboard-receipts-confirmed-badge">{t('receipts.public.confirmedBadge')}</Badge>
              ) : null}
              <Badge variant="outline" data-testid="dashboard-receipts-publication-badge">
                {publicationLabelKeyMap[receipt.publicationStatus]
                  ? t(`receipts.detail.publication.${publicationLabelKeyMap[receipt.publicationStatus]}`)
                  : t('receipts.detail.publication.fallback', { status: receipt.publicationStatus })}
              </Badge>
              {receipt.campaignId && orgId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenCampaign(receipt.campaignId as string)}
                >
                  {receipt.campaignTitle || t('receipts.detail.state.openCampaignFallback')}
                </Button>
              ) : null}
              {hasOcrChanges ? <Badge variant="outline">{t('receipts.detail.state.unsavedOcrChanges')}</Badge> : null}
            </div>

            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.alias')}</dt>
                <dd className="font-medium">{receipt.alias || t('common.na')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.id')}</dt>
                <dd data-testid="dashboard-receipts-state-id" className="break-all font-medium">{receipt.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.file')}</dt>
                <dd data-testid="dashboard-receipts-state-filename" className="font-medium break-all">{receipt.originalFileName || t('common.na')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.merchant')}</dt>
                <dd data-testid="dashboard-receipts-state-merchant" className="font-medium">{receipt.merchantName || t('common.na')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.totalAmount')}</dt>
                <dd data-testid="dashboard-receipts-state-total" className="font-medium">{formatAmount(receipt.totalAmount, locale, t('common.na'))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.purchaseDate')}</dt>
                <dd data-testid="dashboard-receipts-state-purchase-date" className="font-medium">{formatDate(receipt.purchaseDateUtc, locale, t('common.na'))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.createdAt')}</dt>
                <dd data-testid="dashboard-receipts-state-created-at" className="font-medium">{formatDate(receipt.createdAt, locale, t('common.na'))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('receipts.detail.state.campaign')}</dt>
                <dd className="font-medium">{receipt.campaignTitle || t('receipts.detail.state.notAttached')}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">{t('receipts.detail.state.taxVerificationLink')}</dt>
                <dd className="font-medium" data-testid="dashboard-receipts-state-verification-link">
                  {receipt.verificationUrl ? (
                    <a
                      href={receipt.verificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      {t('receipts.detail.state.openVerification')}
                    </a>
                  ) : t('common.na')}
                </dd>
              </div>
            </dl>

            {receipt.verificationFailureReason ? (
              <Alert variant="destructive" data-testid="dashboard-receipts-state-failure-reason">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('receipts.detail.state.verificationFailureTitle')}</AlertTitle>
                <AlertDescription>{receipt.verificationFailureReason}</AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground" data-testid="dashboard-receipts-state-empty">
            {t('receipts.detail.state.empty')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
