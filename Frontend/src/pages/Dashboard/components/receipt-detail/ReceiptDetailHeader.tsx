import { ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReceiptDetailHeaderProps {
  orgId?: string;
  receiptId?: string;
  title: string;
  subtitle: string;
  backToRegistryLabel: string;
  createAnotherLabel: string;
  onBackToList: () => void;
  onCreateAnother: () => void;
}

export function ReceiptDetailHeader({
  orgId,
  receiptId,
  title,
  subtitle,
  backToRegistryLabel,
  createAnotherLabel,
  onBackToList,
  onCreateAnother,
}: ReceiptDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="dashboard-receipts-title">
          <Receipt className="h-6 w-6 text-primary" />
          {title}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground" data-testid="dashboard-receipts-subtitle">
          {subtitle}
        </p>
      </div>

      {orgId ? (
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
          <Button type="button" variant="outline" onClick={onBackToList} data-testid="dashboard-receipts-back-to-list-button">
            <ArrowLeft className="h-4 w-4" />
            {backToRegistryLabel}
          </Button>
          {receiptId ? (
            <Button type="button" onClick={onCreateAnother} data-testid="dashboard-receipts-create-another-button">
              {createAnotherLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
