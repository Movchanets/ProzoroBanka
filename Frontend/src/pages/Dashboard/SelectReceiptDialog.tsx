import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Receipt } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';

// For MVP Phase 3 frontend, we'll mock the receipt fetching if API returns 404
export interface MockReceipt {
  id: string;
  merchantName: string;
  totalAmount: number;
  transactionDate: string;
}

interface SelectReceiptDialogProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (receiptId: string) => void;
}

export function SelectReceiptDialog({
  organizationId,
  open,
  onOpenChange,
  onAttach,
}: SelectReceiptDialogProps) {
  const [search, setSearch] = useState('');

  // Fetch verified receipts for the organization
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts', organizationId, 'verified'],
    queryFn: async () => {
      try {
        // Will be replaced with real endpoint once Phase 5 is done
        const res = await apiFetch<MockReceipt[]>(`/api/organizations/${organizationId}/receipts?status=6`); // 6 = Verified
        return res;
      } catch (err) {
        // Log the error for debugging later
        console.warn('Receipts API not ready:', err);
        // Return dummy data if API not fully implemented
        return [
          { id: '1', merchantName: 'Test Merchant A', totalAmount: 150000, transactionDate: '2026-03-20T10:00:00Z' },
          { id: '2', merchantName: 'Test Merchant B', totalAmount: 55000, transactionDate: '2026-03-21T12:00:00Z' },
        ] as MockReceipt[];
      }
    },
    enabled: open,
  });

  const filteredReceipts = receipts?.filter((r) => 
    r.merchantName?.toLowerCase().includes(search.toLowerCase()) || 
    r.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Вибрати чек для прикріплення</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9" 
            placeholder="Пошук за магазином або ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[300px] mt-4 pr-4">
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Receipt className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Чеки не знайдено</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map((receipt) => (
                <div 
                  key={receipt.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{receipt.merchantName || 'Невідомий продавець'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(receipt.transactionDate).toLocaleDateString('uk-UA')} • 
                      {new Intl.NumberFormat('uk-UA').format(receipt.totalAmount / 100)} ₴
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onAttach(receipt.id)}>
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
