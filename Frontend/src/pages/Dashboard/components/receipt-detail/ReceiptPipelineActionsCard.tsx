import type { ChangeEvent, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OcrModelOption {
  id: string;
  modelIdentifier: string;
  name: string;
  provider: string;
}

interface ReceiptPipelineActionsCardProps {
  receiptIdInput: string;
  selectedTaxXmlFileName: string;
  selectedModelIdentifier: string;
  ocrModels: OcrModelOption[];
  canExtract: boolean;
  requiresExtractConfirmation: boolean;
  isActionBusy: boolean;
  isExtractTemporarilyLocked: boolean;
  isPendingOcr: boolean;
  hasVerificationUrl: boolean;
  canVerify: boolean;
  canActivate: boolean;
  canRefresh: boolean;
  onReceiptIdChange: (value: string) => void;
  onTaxXmlSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onTaxXmlDrop: (event: DragEvent<HTMLDivElement>) => void;
  onModelIdentifierChange: (value: string) => void;
  onExtract: () => void;
  onVerify: () => void;
  onOpenVerificationLink: () => void;
  onActivate: () => void;
  onRefresh: () => void;
}

export function ReceiptPipelineActionsCard({
  receiptIdInput,
  selectedTaxXmlFileName,
  selectedModelIdentifier,
  ocrModels,
  canExtract,
  requiresExtractConfirmation,
  isActionBusy,
  isExtractTemporarilyLocked,
  isPendingOcr,
  hasVerificationUrl,
  canVerify,
  canActivate,
  canRefresh,
  onReceiptIdChange,
  onTaxXmlSelected,
  onTaxXmlDrop,
  onModelIdentifierChange,
  onExtract,
  onVerify,
  onOpenVerificationLink,
  onActivate,
  onRefresh,
}: ReceiptPipelineActionsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-actions-card">
      <CardHeader>
        <CardTitle className="text-lg">{t('receipts.detail.pipeline.title')}</CardTitle>
        <CardDescription>{t('receipts.detail.pipeline.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="receipt-id">{t('receipts.detail.pipeline.receiptIdLabel')}</Label>
            <Input
              id="receipt-id"
              value={receiptIdInput}
              onChange={(event) => onReceiptIdChange(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              data-testid="dashboard-receipts-id-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-xml-file">{t('receipts.detail.pipeline.taxXmlLabel')}</Label>
            <Input
              id="tax-xml-file"
              type="file"
              accept=".xml,text/xml,application/xml"
              data-testid="dashboard-receipts-tax-xml-input"
              onChange={onTaxXmlSelected}
            />
            <div
              className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-sm text-muted-foreground"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onTaxXmlDrop}
              data-testid="dashboard-receipts-tax-xml-dropzone"
            >
              {t('receipts.detail.pipeline.taxXmlDropzone')}
              {selectedTaxXmlFileName ? (
                <div className="mt-1 text-foreground" data-testid="dashboard-receipts-tax-xml-selected-name">
                  {t('receipts.detail.pipeline.taxXmlSelected', { name: selectedTaxXmlFileName })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* OCR Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="space-y-2 flex-1 w-full">
            <Label htmlFor="dashboard-receipts-ocr-model-select">{t('receipts.detail.pipeline.ocrModelLabel')}</Label>
            <Select value={selectedModelIdentifier} onValueChange={onModelIdentifierChange}>
              <SelectTrigger id="dashboard-receipts-ocr-model-select" data-testid="dashboard-receipts-ocr-model-select">
                <SelectValue placeholder={t('receipts.detail.pipeline.ocrModelPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {ocrModels.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.modelIdentifier}
                    data-testid={`dashboard-receipts-ocr-model-option-${model.id}`}
                  >
                    {model.name} ({model.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <Button
              onClick={onExtract}
              disabled={!canExtract || isActionBusy || isExtractTemporarilyLocked}
              data-testid="dashboard-receipts-extract-button"
              className="w-full sm:w-auto"
            >
              {requiresExtractConfirmation
                ? t('receipts.detail.pipeline.reextract')
                : t('receipts.detail.pipeline.extract')}
            </Button>
            {isExtractTemporarilyLocked ? (
              <p className="text-xs text-muted-foreground" data-testid="dashboard-receipts-extract-lock-note">
                {t('receipts.detail.pipeline.extractLockNote')}
              </p>
            ) : null}
          </div>
        </div>

        {/* Verify Section */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-foreground" data-testid="dashboard-receipts-verify-warning">
              {t('receipts.detail.pipeline.verifyWarning')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            <Button
              onClick={onVerify}
              disabled={!canVerify || isActionBusy || isPendingOcr}
              data-testid="dashboard-receipts-verify-button"
            >
              {t('receipts.detail.pipeline.verify')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenVerificationLink}
              disabled={!hasVerificationUrl || isActionBusy}
              data-testid="dashboard-receipts-open-verification-link-button"
              className="border-primary/30 text-foreground hover:bg-primary/10"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('receipts.detail.pipeline.openVerificationLink')}
            </Button>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* Final Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onActivate}
            disabled={!canActivate || isActionBusy || isPendingOcr}
            data-testid="dashboard-receipts-activate-button"
          >
            {t('receipts.detail.pipeline.activate')}
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={!canRefresh || isActionBusy}
            data-testid="dashboard-receipts-refresh-button"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
