import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PublicReceipt } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface PublicReceiptCardProps {
  receipt: PublicReceipt;
}

export function PublicReceiptCard({ receipt }: PublicReceiptCardProps) {
  const { t, i18n } = useTranslation();
  const amount = receipt.totalAmount ?? 0;
  const dateLabel = receipt.transactionDate
    ? new Date(receipt.transactionDate).toLocaleDateString(i18n.language)
    : t('receipts.public.dateNotSpecified');

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-foreground">{receipt.merchantName ?? t('receipts.public.noMerchantName')}</p>
          <p className="text-sm text-muted-foreground">{dateLabel} · {new Intl.NumberFormat(i18n.language).format(amount)} {t('common.uah')}</p>
        </div>
        <Link data-testid="public-campaign-receipt-link" className="text-sm font-semibold text-secondary underline-offset-4 hover:underline" to={`/receipt/${receipt.id}`}>
          {t('receipts.public.viewReceipt')}
        </Link>
      </CardContent>
    </Card>
  );
}
