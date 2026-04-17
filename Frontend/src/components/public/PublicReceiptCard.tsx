import { Link } from '@tanstack/react-router';
import type { PublicReceipt } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface PublicReceiptCardProps {
  receipt: PublicReceipt;
}

export function PublicReceiptCard({ receipt }: PublicReceiptCardProps) {
  const amount = receipt.totalAmount ?? 0;
  const dateLabel = receipt.transactionDate
    ? new Date(receipt.transactionDate).toLocaleDateString('uk-UA')
    : 'Дата не вказана';

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-foreground">{receipt.merchantName ?? 'Без назви мерчанта'}</p>
          <p className="text-sm text-muted-foreground">{dateLabel} · {new Intl.NumberFormat('uk-UA').format(amount)} грн</p>
        </div>
        <Link data-testid="public-campaign-receipt-link" className="text-sm font-semibold text-secondary underline-offset-4 hover:underline" to={`/receipt/${receipt.id}`}>
          Переглянути чек
        </Link>
      </CardContent>
    </Card>
  );
}
