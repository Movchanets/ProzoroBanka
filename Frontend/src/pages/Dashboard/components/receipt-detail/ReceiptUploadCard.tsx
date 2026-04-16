import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Crop, FileDigit, FileImage, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReceiptUploadCardProps {
  selectedFile: File | null;
  displayedReceiptPreview: string | null;
  displayedReceiptFileName: string;
  selectedFileWasCropped: boolean;
  isActionBusy: boolean;
  isUpdateDraftMode: boolean;
  isUploadingDraft: boolean;
  onReceiptFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadDraft: () => void;
  onRecropReceipt: () => void;
}

export function ReceiptUploadCard({
  selectedFile,
  displayedReceiptPreview,
  displayedReceiptFileName,
  selectedFileWasCropped,
  isActionBusy,
  isUpdateDraftMode,
  isUploadingDraft,
  onReceiptFileSelected,
  onUploadDraft,
  onRecropReceipt,
}: ReceiptUploadCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-upload-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileDigit className="h-5 w-5 text-primary" />
          {t('receipts.detail.receiptFile.title')}
        </CardTitle>
        <CardDescription>{t('receipts.detail.receiptFile.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receipt-file">{t('receipts.detail.receiptFile.inputLabel')}</Label>
          <Input
            id="receipt-file"
            type="file"
            accept="image/*,application/pdf"
            data-testid="dashboard-receipts-upload-file-input"
            onChange={onReceiptFileSelected}
          />
        </div>
        {selectedFile ? (
          <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/10 p-3">
            {displayedReceiptPreview ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border/60 bg-background" data-testid="dashboard-receipts-upload-preview">
                  <img src={displayedReceiptPreview} alt={t('receipts.detail.receiptFile.previewAlt')} className="max-h-80 w-full object-contain" />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="break-all font-medium">{displayedReceiptFileName}</span>
                  <Badge variant="outline">{selectedFileWasCropped ? t('receipts.detail.receiptFile.croppedBadge') : t('receipts.detail.receiptFile.originalBadge')}</Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <FileImage className="h-5 w-5 text-primary" />
                <span>{displayedReceiptFileName}</span>
              </div>
            )}
          </div>
        ) : displayedReceiptPreview ? (
          <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/10 p-3">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background" data-testid="dashboard-receipts-upload-preview">
                <img src={displayedReceiptPreview} alt={t('receipts.detail.receiptFile.serverPreviewAlt')} className="max-h-80 w-full object-contain" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="break-all font-medium">{displayedReceiptFileName}</span>
                <Badge variant="outline">{t('receipts.detail.receiptFile.backendBadge')}</Badge>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onUploadDraft}
            disabled={!selectedFile || isActionBusy}
            data-testid="dashboard-receipts-upload-button"
          >
            {isUploadingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUpdateDraftMode ? t('receipts.detail.receiptFile.updateDraft') : t('receipts.detail.receiptFile.uploadDraft')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedFile || !displayedReceiptPreview || isActionBusy}
            onClick={onRecropReceipt}
            data-testid="dashboard-receipts-recrop-button"
          >
            <Crop className="h-4 w-4" />
            {t('receipts.detail.receiptFile.recrop')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
