import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Plus, Receipt } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyReceipts } from '@/hooks/queries/useReceipts';
import { ReceiptStatus } from '@/types';

interface SelectReceiptDialogProps {
  organizationId: string;
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (receiptId: string) => Promise<void> | void;
  isAttaching?: boolean;
}

export function SelectReceiptDialog({
  organizationId,
  campaignId,
  open,
  onOpenChange,
  onAttach,
  isAttaching = false,
}: SelectReceiptDialogProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());

  const { data: receipts = [], isLoading } = useMyReceipts(
    organizationId,
    deferredSearch,
    ReceiptStatus.StateVerified,
    true,
    open,
  );

  const filteredReceipts = useMemo(() => {
    if (!deferredSearch) {
      return receipts;
    }

    const normalizedSearch = deferredSearch.toLowerCase();
    return receipts.filter((receipt) =>
      receipt.id.toLowerCase().includes(normalizedSearch)
      || receipt.alias?.toLowerCase().includes(normalizedSearch)
      || receipt.merchantName?.toLowerCase().includes(normalizedSearch)
      || receipt.originalFileName.toLowerCase().includes(normalizedSearch),
    );
  }, [deferredSearch, receipts]);

  const formatAmount = (value?: number) => {
    if (typeof value !== 'number') {
      return '—';
    }

    const hryvnias = value / 100;

    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      maximumFractionDigits: 2,
    }).format(hryvnias);
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString('uk-UA');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Вибрати чек для прикріплення</DialogTitle>
          <DialogDescription>
            Для цього збору доступні лише перевірені чеки, які ще не прикріплені до іншого campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Пошук по alias, магазину, файлу або ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate({
                to: '/dashboard/$orgId/receipts/new',
                params: { orgId: organizationId },
                state: { campaignId },
              });
            }}
          >
            <Plus className="h-4 w-4" />
            Створити чек
          </Button>
        </div>

        <ScrollArea className="mt-4 h-[380px] pr-4">
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Receipt className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">Чеки не знайдено</p>
              <p className="mt-1 max-w-sm text-xs">
                Створіть новий чек, завершіть verify і поверніться сюди для прикріплення до збору.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{receipt.alias || 'Без alias'}</p>
                      <Badge variant="outline">Verified</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {receipt.merchantName || 'Магазин не визначено'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={receipt.originalFileName}>
                      {receipt.originalFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(receipt.purchaseDateUtc)} • {formatAmount(receipt.totalAmount)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onAttach(receipt.id)}
                    disabled={isAttaching}
                  >
                    Вибрати
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
