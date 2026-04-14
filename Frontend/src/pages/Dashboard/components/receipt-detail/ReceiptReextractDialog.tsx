import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReceiptReextractDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onConfirm: () => void;
}

export function ReceiptReextractDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: ReceiptReextractDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dashboard-receipts-reextract-dialog">
        <DialogHeader>
          <DialogTitle>{t('receipts.detail.reextractDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('receipts.detail.reextractDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="dashboard-receipts-reextract-cancel-button"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            data-testid="dashboard-receipts-reextract-confirm-button"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('receipts.detail.reextractDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
