import { AlertCircle, CheckCircle2, FileDigit, Loader2, PencilLine, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ReceiptItemsTable } from '@/components/receipt/ReceiptItemsTable';
import type { ReceiptItem, UpdateReceiptItemRequest } from '@/types';

interface OcrDraftModel {
  merchantName: string;
  totalAmount: string;
  purchaseDateUtc: string;
  fiscalNumber: string;
  receiptCode: string;
  currency: string;
}

interface ItemDraftModel {
  name: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  barcode: string;
}

interface ReceiptOcrEditorCardProps {
  hasReceipt: boolean;
  missingOcrFields: string[];
  aliasInput: string;
  ocrDraft: OcrDraftModel;
  hasOcrChanges: boolean;
  itemDraft: ItemDraftModel;
  activeReceiptId: string;
  isActionBusy: boolean;
  isSavePending: boolean;
  structuredOutputJson: string | null;
  items: ReceiptItem[];
  onAliasChange: (value: string) => void;
  onChangeOcrField: (field: keyof OcrDraftModel, value: string) => void;
  onSaveOcrDraft: () => void;
  onResetOcrDraft: () => void;
  onItemDraftChange: (field: keyof ItemDraftModel, value: string) => void;
  onAddReceiptItem: () => void;
  onUpdateReceiptItem: (itemId: string, payload: UpdateReceiptItemRequest) => Promise<void>;
  onDeleteReceiptItem: (itemId: string) => Promise<void>;
}

export function ReceiptOcrEditorCard({
  hasReceipt,
  missingOcrFields,
  aliasInput,
  ocrDraft,
  hasOcrChanges,
  itemDraft,
  activeReceiptId,
  isActionBusy,
  isSavePending,
  structuredOutputJson,
  items,
  onAliasChange,
  onChangeOcrField,
  onSaveOcrDraft,
  onResetOcrDraft,
  onItemDraftChange,
  onAddReceiptItem,
  onUpdateReceiptItem,
  onDeleteReceiptItem,
}: ReceiptOcrEditorCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="min-w-0 border border-border bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PencilLine className="h-5 w-5 text-primary" />
          {t('receipts.detail.ocr.title')}
        </CardTitle>
        <CardDescription>{t('receipts.detail.ocr.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasReceipt ? (
          <>
            {missingOcrFields.length > 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('receipts.detail.ocr.missingFieldsTitle')}</AlertTitle>
                <AlertDescription>{missingOcrFields.join(', ')}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>{t('receipts.detail.ocr.readyTitle')}</AlertTitle>
                <AlertDescription>{t('receipts.detail.ocr.readyDescription')}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ocr-alias">{t('receipts.detail.ocr.aliasLabel')}</Label>
                  <Input
                    id="ocr-alias"
                    value={aliasInput}
                    onChange={(event) => onAliasChange(event.target.value)}
                    placeholder={t('receipts.detail.ocr.aliasPlaceholder')}
                    data-testid="dashboard-receipts-alias-input"
                  />
                  <p className="wrap-break-word text-xs text-muted-foreground">
                    {t('receipts.detail.ocr.aliasHint')}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ocr-merchant">{t('receipts.detail.ocr.fields.merchantName')}</Label>
                  <Input id="ocr-merchant" value={ocrDraft.merchantName} onChange={(event) => onChangeOcrField('merchantName', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ocr-total">{t('receipts.detail.ocr.fields.totalAmount')}</Label>
                  <Input id="ocr-total" value={ocrDraft.totalAmount} onChange={(event) => onChangeOcrField('totalAmount', event.target.value)} placeholder="102.88" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ocr-currency">{t('receipts.detail.ocr.fields.currency')}</Label>
                  <Input id="ocr-currency" value={ocrDraft.currency} onChange={(event) => onChangeOcrField('currency', event.target.value)} placeholder="UAH" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ocr-purchase-date">{t('receipts.detail.ocr.fields.purchaseDateUtc')}</Label>
                  <Input id="ocr-purchase-date" type="datetime-local" value={ocrDraft.purchaseDateUtc} onChange={(event) => onChangeOcrField('purchaseDateUtc', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ocr-fiscal-number">{t('receipts.detail.ocr.fields.fiscalNumber')}</Label>
                  <Input id="ocr-fiscal-number" value={ocrDraft.fiscalNumber} onChange={(event) => onChangeOcrField('fiscalNumber', event.target.value)} placeholder="3001041447" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ocr-receipt-code">{t('receipts.detail.ocr.fields.receiptCode')}</Label>
                  <Input id="ocr-receipt-code" value={ocrDraft.receiptCode} onChange={(event) => onChangeOcrField('receiptCode', event.target.value)} placeholder="10870061" />
                </div>
                <div className="flex flex-wrap items-start gap-2 md:col-span-2">
                  <Button className="w-full sm:w-auto" onClick={onSaveOcrDraft} disabled={!activeReceiptId || isActionBusy || !hasOcrChanges} data-testid="dashboard-receipts-save-ocr-button">
                    {isSavePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t('receipts.detail.ocr.saveButton')}
                  </Button>
                  <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={onResetOcrDraft} disabled={isActionBusy}>
                    {t('receipts.detail.ocr.resetButton')}
                  </Button>
                </div>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="space-y-2">
                  <Label>{t('receipts.detail.itemsForm.title')}</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5" data-testid="dashboard-receipts-add-item-form">
                    <Input
                      value={itemDraft.name}
                      onChange={(event) => onItemDraftChange('name', event.target.value)}
                      placeholder={t('receipts.detail.itemsForm.namePlaceholder')}
                      data-testid="dashboard-receipts-add-item-name-input"
                    />
                    <Input
                      value={itemDraft.quantity}
                      onChange={(event) => onItemDraftChange('quantity', event.target.value)}
                      placeholder={t('receipts.detail.itemsForm.quantityPlaceholder')}
                      data-testid="dashboard-receipts-add-item-quantity-input"
                    />
                    <Input
                      value={itemDraft.unitPrice}
                      onChange={(event) => onItemDraftChange('unitPrice', event.target.value)}
                      placeholder={t('receipts.detail.itemsForm.unitPricePlaceholder')}
                      data-testid="dashboard-receipts-add-item-unit-price-input"
                    />
                    <Input
                      value={itemDraft.totalPrice}
                      onChange={(event) => onItemDraftChange('totalPrice', event.target.value)}
                      placeholder={t('receipts.detail.itemsForm.totalPricePlaceholder')}
                      data-testid="dashboard-receipts-add-item-total-price-input"
                    />
                    <Input
                      value={itemDraft.barcode}
                      onChange={(event) => onItemDraftChange('barcode', event.target.value)}
                      placeholder={t('receipts.detail.itemsForm.barcodePlaceholder')}
                      data-testid="dashboard-receipts-add-item-barcode-input"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onAddReceiptItem}
                    disabled={!activeReceiptId || isActionBusy}
                    data-testid="dashboard-receipts-add-item-button"
                  >
                    {t('receipts.detail.itemsForm.addButton')}
                  </Button>
                  <div className="w-full min-w-0 overflow-x-auto">
                    <ReceiptItemsTable
                      items={items}
                      structuredOutputJson={structuredOutputJson}
                      testIdPrefix="dashboard-receipts-items"
                      onUpdateItem={(itemId, payload) => onUpdateReceiptItem(itemId, payload)}
                      onDeleteItem={(itemId) => onDeleteReceiptItem(itemId)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/10 text-center">
            <FileDigit className="h-8 w-8 text-primary/70" />
            <div>
              <p className="font-medium">{t('receipts.detail.ocr.emptyTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('receipts.detail.ocr.emptyDescription')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
