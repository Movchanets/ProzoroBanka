import { useState, useEffect, useMemo, type DragEvent } from 'react';
import { useSubmit, useActionData, useNavigation, useParams, useNavigate } from 'react-router';
import type { ActionFunctionArgs as ClientActionArgs } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import {
  usePurchaseDetailShort,
  getPurchaseDetailShortOptions,
  purchaseKeys,
  purchaseShortKeys,
} from '@/hooks/queries/usePurchases';
import { ensureQueryData } from '@/utils/routerHelpers';
import { getCampaignsOptions } from '@/hooks/queries/useCampaigns';
import type { LoaderFunctionArgs } from 'react-router';
import { CampaignStatus, PurchaseStatus, DocumentType, OcrProcessingStatus, type DocumentDto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Trash2, UploadCloud, Sparkles, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentPreviewDialog } from '@/components/ui/document-preview-dialog';
import { purchaseService } from '@/services/purchaseService';
import { queryClient } from '@/services/queryClient';

function getPurchaseStatusLabel(status: PurchaseStatus, t: TFunction) {
  switch (status) {
    case PurchaseStatus.PaymentSent:
      return t('purchases.status.paymentSent', 'Оплату проведено');
    case PurchaseStatus.PartiallyReceived:
      return t('purchases.status.partiallyReceived', 'Частково отримано');
    case PurchaseStatus.Completed:
      return t('purchases.status.completed', 'Завершено');
    case PurchaseStatus.Cancelled:
      return t('purchases.status.cancelled', 'Скасовано');
    default:
      return t('purchases.status.fallback', 'Статус {{status}}').replace('{{status}}', String(status));
  }
}

function getDocumentTypeLabel(type: DocumentType, t: TFunction) {
  switch (type) {
    case DocumentType.BankReceipt:
      return t('purchases.documentTypes.bankReceipt', 'Банківська квитанція');
    case DocumentType.Waybill:
      return t('purchases.documentTypes.waybill', 'Видаткова накладна');
    case DocumentType.Invoice:
      return t('purchases.documentTypes.invoice', 'Рахунок');
    case DocumentType.TransferAct:
      return t('purchases.documentTypes.transferAct', 'Акт прийому-передачі');
    case DocumentType.Other:
      return t('purchases.documentTypes.other', 'Інше');
    default:
      return t('purchases.documentTypes.other', 'Інше');
  }
}



function DocumentMetadataForm({
  document,
  onSubmit,
  onAddWaybillItem,
  onUpdateWaybillItem,
  onDeleteWaybillItem,
  isPending,
  t,
}: {
  document: DocumentDto;
  onSubmit: (documentId: string, payload: {
    amount?: number;
    counterpartyName?: string;
    documentDate?: string;
    edrpou?: string;
    payerFullName?: string;
    receiptCode?: string;
    paymentPurpose?: string;
    senderIban?: string;
    receiverIban?: string;
  }) => Promise<void>;
  onAddWaybillItem?: (documentId: string, payload: { name: string; quantity: number; unitPrice: number }) => Promise<void>;
  onUpdateWaybillItem?: (documentId: string, itemId: string, payload: { name: string; quantity: number; unitPrice: number }) => Promise<void>;
  onDeleteWaybillItem?: (documentId: string, itemId: string) => Promise<void>;
  isPending: boolean;
  t: TFunction;
}) {
  const [amountInput, setAmountInput] = useState(document.amount ? (document.amount / 100).toFixed(2) : '');
  const [counterpartyName, setCounterpartyName] = useState(document.counterpartyName ?? '');
  const [documentDate, setDocumentDate] = useState(document.documentDate ? document.documentDate.slice(0, 10) : '');
  const [edrpou, setEdrpou] = useState(document.edrpou ?? '');
  const [payerFullName, setPayerFullName] = useState(document.payerFullName ?? '');
  const [receiptCode, setReceiptCode] = useState(document.receiptCode ?? '');
  const [paymentPurpose, setPaymentPurpose] = useState(document.paymentPurpose ?? '');
  const [senderIban, setSenderIban] = useState(document.senderIban ?? '');
  const [receiverIban, setReceiverIban] = useState(document.receiverIban ?? '');
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitPrice, setItemUnitPrice] = useState('0');
  const documentItems = useMemo(() => document.items ?? [], [document.items]);
  const [editableItems, setEditableItems] = useState(
    documentItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice / 100),
    })),
  );

  const parseEditableItemForSave = (editableItem: { id: string; name: string; quantity: string; unitPrice: string }) => {
    const quantity = Number(editableItem.quantity.replace(',', '.'));
    const unitPriceHryvnia = Number(editableItem.unitPrice.replace(',', '.'));

    if (!editableItem.name.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPriceHryvnia) || unitPriceHryvnia < 0) {
      return null;
    }

    return {
      name: editableItem.name.trim(),
      quantity,
      unitPrice: Math.round(unitPriceHryvnia * 100),
    };
  };

  const isItemChanged = (editableItem: { id: string; name: string; quantity: string; unitPrice: string }) => {
    const sourceItem = documentItems.find((candidate: any) => candidate.id === editableItem.id);
    if (!sourceItem) {
      return false;
    }

    const parsed = parseEditableItemForSave(editableItem);
    if (!parsed) {
      return true;
    }

    return sourceItem.name !== parsed.name
      || sourceItem.quantity !== parsed.quantity
      || sourceItem.unitPrice !== parsed.unitPrice;
  };

  const handleSave = async () => {
    if (isWaybill && onUpdateWaybillItem) {
      const changedItems = editableItems.filter(isItemChanged);
      for (const editableItem of changedItems) {
        const parsed = parseEditableItemForSave(editableItem);
        if (!parsed) {
          toast.error(t('purchases.invalidWaybillItem'));
          return;
        }

        await onUpdateWaybillItem(document.id, editableItem.id, parsed);
      }
    }

    const normalizedAmount = amountValue.trim().length > 0 ? Number(amountValue.replace(',', '.')) : undefined;

    await onSubmit(document.id, {
      amount: Number.isFinite(normalizedAmount) ? Math.round((normalizedAmount ?? 0) * 100) : undefined,
      counterpartyName: counterpartyName.trim() || undefined,
      documentDate: documentDate || undefined,
      edrpou: document.type === DocumentType.BankReceipt ? edrpou.trim() : undefined,
      payerFullName: document.type === DocumentType.BankReceipt ? payerFullName.trim() : undefined,
      receiptCode: document.type === DocumentType.BankReceipt ? receiptCode.trim() : undefined,
      paymentPurpose: document.type === DocumentType.BankReceipt ? paymentPurpose.trim() : undefined,
      senderIban: document.type === DocumentType.BankReceipt ? senderIban.trim() : undefined,
      receiverIban: document.type === DocumentType.BankReceipt ? receiverIban.trim() : undefined,
    });
  };

  const isBankReceipt = document.type === DocumentType.BankReceipt;
  const isWaybill = document.type === DocumentType.Waybill;
  const isWaybillLike = document.type === DocumentType.Waybill || document.type === DocumentType.Invoice;

  const calculatedWaybillAmount = (() => {
    if (!isWaybillLike) {
      return null;
    }

    if (isWaybill && editableItems.length > 0) {
      return editableItems.reduce((sum: number, item: any) => {
        const qty = Number(item.quantity.replace(',', '.'));
        const unit = Number(item.unitPrice.replace(',', '.'));
        if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty < 0 || unit < 0) {
          return sum;
        }

        return sum + (qty * unit);
      }, 0);
    }

    return documentItems.reduce((sum: number, item: any) => sum + (item.totalPrice / 100), 0);
  })();

  const amountValue = calculatedWaybillAmount !== null
    ? calculatedWaybillAmount.toFixed(2)
    : amountInput;

  if (isWaybillLike) {
    const handleAddItem = async () => {
      if (!onAddWaybillItem) {
        return;
      }

      const quantity = Number(itemQuantity.replace(',', '.'));
      const unitPriceHryvnia = Number(itemUnitPrice.replace(',', '.'));

      if (!itemName.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPriceHryvnia) || unitPriceHryvnia < 0) {
        toast.error(t('purchases.invalidWaybillItem'));
        return;
      }

      await onAddWaybillItem(document.id, {
        name: itemName.trim(),
        quantity,
        unitPrice: Math.round(unitPriceHryvnia * 100),
      });

      setItemName('');
      setItemQuantity('1');
      setItemUnitPrice('0');
    };

    const handleUpdateItem = async (itemId: string) => {
      if (!onUpdateWaybillItem) {
        return;
      }

      const targetItem = editableItems.find((item: any) => item.id === itemId);
      if (!targetItem) {
        return;
      }

      const parsed = parseEditableItemForSave(targetItem);
      if (!parsed) {
        toast.error(t('purchases.invalidWaybillItem'));
        return;
      }

      await onUpdateWaybillItem(document.id, itemId, parsed);
    };

    const handleDeleteItem = async (itemId: string) => {
      if (!onDeleteWaybillItem) {
        return;
      }

      const confirmed = window.confirm(t('receipts.detail.dialogs.confirmDeleteItem'));
      if (!confirmed) {
        return;
      }

      await onDeleteWaybillItem(document.id, itemId);
    };

    return (
      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3" data-testid={`purchase-document-metadata-form-${document.id}`}>
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t('purchases.items.listTitle')}</p>
          <div className="hidden md:grid md:grid-cols-14 md:gap-2 px-2 text-[11px] font-medium text-muted-foreground" data-testid={`purchase-document-items-header-${document.id}`}>
            <p className="md:col-span-5">{t('purchases.items.itemName')}</p>
            <p className="md:col-span-2">{t('purchases.items.qty')}</p>
            <p className="md:col-span-2">{t('purchases.items.price')}</p>
            <p className="md:col-span-2 text-right">{t('purchases.items.total')}</p>
            <p className="md:col-span-3 text-right">{t('purchases.items.actions')}</p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2" data-testid={`purchase-document-items-list-${document.id}`}>
            {documentItems.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-testid={`purchase-document-items-empty-${document.id}`}>{t('purchases.items.empty')}</p>
            ) : !isWaybill || editableItems.length === 0 ? (
              documentItems.map((item: any) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-14 items-center gap-2 rounded-md border border-border/50 bg-background p-2 text-xs" data-testid={`purchase-document-item-row-${item.id}`}>
                  <p className="md:col-span-5 truncate font-medium">{item.name}</p>
                  <p className="md:col-span-2 text-muted-foreground">{item.quantity}</p>
                  <p className="md:col-span-2 text-muted-foreground">{(item.unitPrice / 100).toFixed(2)} ₴</p>
                  <p className="md:col-span-2 md:text-right font-semibold">{(item.totalPrice / 100).toFixed(2)} ₴</p>
                </div>
              ))
            ) : (
              editableItems.map((editableItem: any) => {
                const item = documentItems.find((candidate: any) => candidate.id === editableItem.id);
                if (!item) {
                  return null;
                }

                return (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-14 items-center gap-2 rounded-md border border-border/50 bg-background p-2 text-xs" data-testid={`purchase-document-item-row-${item.id}`}>
                    <div className="md:col-span-5">
                      <Input value={editableItem.name} onChange={(event) => setEditableItems((current: any[]) => current.map((candidate: any) => candidate.id === item.id ? { ...candidate, name: event.target.value } : candidate))} data-testid={`purchase-document-item-name-${item.id}`} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" step="0.001" min="0" value={editableItem.quantity} onChange={(event) => setEditableItems((current: any[]) => current.map((candidate: any) => candidate.id === item.id ? { ...candidate, quantity: event.target.value } : candidate))} data-testid={`purchase-document-item-quantity-${item.id}`} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" step="0.01" min="0" value={editableItem.unitPrice} onChange={(event) => setEditableItems((current: any[]) => current.map((candidate: any) => candidate.id === item.id ? { ...candidate, unitPrice: event.target.value } : candidate))} data-testid={`purchase-document-item-unit-price-${item.id}`} />
                    </div>
                    <p className="md:col-span-2 md:text-right font-semibold">{(Math.round(Number(editableItem.quantity.replace(',', '.')) * Number(editableItem.unitPrice.replace(',', '.')) * 100) / 100).toFixed(2)} ₴</p>
                    <div className="md:col-span-3 flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleUpdateItem(item.id)} data-testid={`purchase-document-item-save-${item.id}`}>
                        {t('common.save')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => void handleDeleteItem(item.id)} data-testid={`purchase-document-item-delete-${item.id}`}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {isWaybill ? (
            <div className="grid gap-2 rounded-md border border-border/50 bg-background p-2 text-xs" data-testid={`purchase-document-add-item-form-${document.id}`}>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder={t('purchases.items.itemName')}
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  data-testid={`purchase-document-add-item-name-${document.id}`}
                />
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={itemQuantity}
                  onChange={(event) => setItemQuantity(event.target.value)}
                  data-testid={`purchase-document-add-item-quantity-${document.id}`}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemUnitPrice}
                  onChange={(event) => setItemUnitPrice(event.target.value)}
                  data-testid={`purchase-document-add-item-unit-price-${document.id}`}
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="secondary" onClick={handleAddItem} disabled={isPending} data-testid={`purchase-document-add-item-submit-${document.id}`}>
                  {t('purchases.items.addItem')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-date-${document.id}`}>{t('purchases.documentDate', 'Дата документа')}</Label>
            <Input
              id={`purchase-document-date-${document.id}`}
              type="date"
              value={documentDate}
              onChange={(event) => setDocumentDate(event.target.value)}
              data-testid={`purchase-document-date-input-${document.id}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-amount-${document.id}`}>{t('purchases.documentAmount', 'Сума документа (₴)')}</Label>
            <Input
              id={`purchase-document-amount-${document.id}`}
              type="number"
              step="0.01"
              min="0"
              value={amountValue}
              onChange={(event) => {
                if (!isWaybillLike) {
                  setAmountInput(event.target.value);
                }
              }}
              data-testid={`purchase-document-amount-input-${document.id}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-counterparty-${document.id}`}>{t('purchases.counterparty', 'Контрагент')}</Label>
            <Input
              id={`purchase-document-counterparty-${document.id}`}
              value={counterpartyName}
              onChange={(event) => setCounterpartyName(event.target.value)}
              data-testid={`purchase-document-counterparty-input-${document.id}`}
            />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={isPending} data-testid={`purchase-document-save-metadata-${document.id}`}>
            <Save className="h-4 w-4 mr-2" />
            {t('purchases.saveMetadata', 'Зберегти метадані')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3" data-testid={`purchase-document-metadata-form-${document.id}`}>
      {isBankReceipt ? (
        <div className="grid gap-3 sm:grid-cols-2" data-testid={`purchase-document-bank-fields-${document.id}`}>
          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-edrpou-${document.id}`}>{t('purchases.bankReceipt.edrpou', 'ЄДРПОУ')}</Label>
            <Input id={`purchase-document-edrpou-${document.id}`} value={edrpou} onChange={(event) => setEdrpou(event.target.value)} data-testid={`purchase-document-edrpou-input-${document.id}`} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-payer-full-name-${document.id}`}>{t('purchases.bankReceipt.payerFullName', 'Платник')}</Label>
            <Input id={`purchase-document-payer-full-name-${document.id}`} value={payerFullName} onChange={(event) => setPayerFullName(event.target.value)} data-testid={`purchase-document-payer-full-name-input-${document.id}`} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-receipt-code-${document.id}`}>{t('purchases.bankReceipt.receiptCode', 'Код квитанції')}</Label>
            <Input id={`purchase-document-receipt-code-${document.id}`} value={receiptCode} onChange={(event) => setReceiptCode(event.target.value)} data-testid={`purchase-document-receipt-code-input-${document.id}`} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`purchase-document-payment-purpose-${document.id}`}>{t('purchases.bankReceipt.paymentPurpose', 'Призначення платежу')}</Label>
            <Input id={`purchase-document-payment-purpose-${document.id}`} value={paymentPurpose} onChange={(event) => setPaymentPurpose(event.target.value)} data-testid={`purchase-document-payment-purpose-input-${document.id}`} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-sender-iban-${document.id}`}>{t('purchases.bankReceipt.senderIban', 'IBAN відправника')}</Label>
            <Input id={`purchase-document-sender-iban-${document.id}`} value={senderIban} onChange={(event) => setSenderIban(event.target.value)} data-testid={`purchase-document-sender-iban-input-${document.id}`} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`purchase-document-receiver-iban-${document.id}`}>{t('purchases.bankReceipt.receiverIban', 'IBAN отримувача')}</Label>
            <Input id={`purchase-document-receiver-iban-${document.id}`} value={receiverIban} onChange={(event) => setReceiverIban(event.target.value)} data-testid={`purchase-document-receiver-iban-input-${document.id}`} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`purchase-document-date-${document.id}`}>{t('purchases.documentDate', 'Дата документа')}</Label>
          <Input
            id={`purchase-document-date-${document.id}`}
            type="date"
            value={documentDate}
            onChange={(event) => setDocumentDate(event.target.value)}
            data-testid={`purchase-document-date-input-${document.id}`}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`purchase-document-amount-${document.id}`}>{t('purchases.documentAmount', 'Сума документа (₴)')}</Label>
          <Input
            id={`purchase-document-amount-${document.id}`}
            type="number"
            step="0.01"
            min="0"
            value={amountValue}
            onChange={(event) => {
              if (!isWaybillLike) {
                setAmountInput(event.target.value);
              }
            }}
            data-testid={`purchase-document-amount-input-${document.id}`}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`purchase-document-counterparty-${document.id}`}>{t('purchases.counterparty', 'Контрагент')}</Label>
          <Input
            id={`purchase-document-counterparty-${document.id}`}
            value={counterpartyName}
            onChange={(event) => setCounterpartyName(event.target.value)}
            data-testid={`purchase-document-counterparty-input-${document.id}`}
          />
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={isPending} data-testid={`purchase-document-save-metadata-${document.id}`}>
          <Save className="h-4 w-4 mr-2" />
          {t('purchases.saveMetadata', 'Зберегти метадані')}
        </Button>
      </div>
    </div>
  );
}

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const { orgId, purchaseId } = params;
  if (!orgId) return null;

  const promises: Promise<unknown>[] = [
    ensureQueryData(getCampaignsOptions(orgId, CampaignStatus.Active)),
  ];

  if (purchaseId && purchaseId !== 'new') {
    promises.push(ensureQueryData(getPurchaseDetailShortOptions(orgId, purchaseId)));
  }

  await Promise.allSettled(promises);
  return null;
}

export async function clientAction({ request, params }: ClientActionArgs) {
  const { orgId, purchaseId } = params;
  if (!orgId) throw new Error('Organization ID missing');

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'savePurchase') {
      const payload = {
        title: String(formData.get('title')),
        totalAmount: Number(formData.get('totalAmount')),
        status: Number(formData.get('status')) as PurchaseStatus,
      };
      if (purchaseId === 'new') {
        const purchase = await purchaseService.createDraft({ ...payload, organizationId: orgId });
        return { success: true, intent: 'create', purchaseId: purchase.id };
      } else {
        await purchaseService.updateShort(orgId, purchaseId!, payload);
        queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
        return { success: true, intent: 'update' };
      }
    }

    if (intent === 'deletePurchase') {
      await purchaseService.deleteShort(orgId, purchaseId!);
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      return { success: true, intent: 'delete' };
    }

    if (intent === 'attachToCampaign') {
      const campaignId = String(formData.get('campaignId'));
      await purchaseService.attachToCampaign(purchaseId!, { campaignId });
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'attach' };
    }

    if (intent === 'uploadDocument') {
      const file = formData.get('file') as File;
      const type = Number(formData.get('type')) as DocumentType;
      await purchaseService.uploadDocumentShort(orgId, purchaseId!, file, type);
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'upload' };
    }

    if (intent === 'deleteDocument') {
      const documentId = String(formData.get('documentId'));
      await purchaseService.deleteDocumentShort(orgId, purchaseId!, documentId);
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'deleteDocument' };
    }

    if (intent === 'updateDocumentMetadata') {
      const documentId = String(formData.get('documentId'));
      const payload = JSON.parse(String(formData.get('payload')));
      await purchaseService.updateDocumentMetadataShort(orgId, purchaseId!, documentId, payload);
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'updateDocumentMetadata' };
    }

    if (intent === 'addWaybillItem') {
      const documentId = String(formData.get('documentId'));
      const payload = JSON.parse(String(formData.get('payload')));
      await purchaseService.addItemToWaybill(documentId, payload);
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'addWaybillItem' };
    }

    if (intent === 'updateWaybillItem') {
      const documentId = String(formData.get('documentId'));
      const itemId = String(formData.get('itemId'));
      const payload = JSON.parse(String(formData.get('payload')));
      await purchaseService.updateWaybillItem(documentId, itemId, payload);
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'updateWaybillItem' };
    }

    if (intent === 'deleteWaybillItem') {
      const documentId = String(formData.get('documentId'));
      const itemId = String(formData.get('itemId'));
      await purchaseService.deleteWaybillItem(documentId, itemId);
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'deleteWaybillItem' };
    }

    if (intent === 'processOcr') {
      const documentId = String(formData.get('documentId'));
      await purchaseService.processDocumentOcrShort(orgId, purchaseId!, documentId, { confirmReprocess: true });
      queryClient.invalidateQueries({ queryKey: purchaseShortKeys.detail(orgId, purchaseId!) });
      return { success: true, intent: 'processOcr' };
    }

    return { error: 'Unknown intent' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Action failed' };
  }
}

export default function OrganizationPurchaseDetailPage() {
  const { t, i18n } = useTranslation();
  const { orgId, purchaseId } = useParams<{ orgId: string; purchaseId: string }>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData() as { success?: boolean; intent?: string; purchaseId?: string; error?: string } | undefined;
  const navigation = useNavigation();

  const isNew = purchaseId === 'new';
  const isDocumentsLocked = isNew;

  const { data: campaignsData = [] } = useCampaigns(orgId ?? '');
  const activeCampaigns = campaignsData.filter((campaign) => campaign.status === CampaignStatus.Active);

  const { data: purchase, isLoading: isPurchaseLoading } = usePurchaseDetailShort(orgId ?? '', purchaseId ?? '', !isNew);

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      status: String(PurchaseStatus.PaymentSent),
      totalAmount: 0,
    },
  });

  const [receiptUploadFile, setReceiptUploadFile] = useState<File | null>(null);
  const [waybillUploadFile, setWaybillUploadFile] = useState<File | null>(null);
  const [transferUploadFile, setTransferUploadFile] = useState<File | null>(null);
  const [waybillUploadType, setWaybillUploadType] = useState<DocumentType>(DocumentType.Waybill);
  const [activeUploadHoverZone, setActiveUploadHoverZone] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{ src: string; title: string; fileName?: string; mimeType?: string } | null>(null);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [selectedAttachCampaignId, setSelectedAttachCampaignId] = useState<string>('');

  const openDocumentPreview = (fileUrl: string | null, originalFileName: string) => {
    if (!fileUrl) return;
    setPreviewDocument({ src: fileUrl, title: originalFileName, fileName: originalFileName });
  };

  useEffect(() => {
    if (purchase) {
      reset({
        title: purchase.title,
        status: String(purchase.status),
        totalAmount: purchase.totalAmount / 100,
      });
    }
  }, [purchase, reset]);

  useEffect(() => {
    if (actionData?.success) {
      if (actionData.intent === 'create' && actionData.purchaseId) {
        toast.success(t('purchases.createSuccess', 'Закупівлю створено'));
        navigate(`/dashboard/${orgId}/purchases/${actionData.purchaseId}`);
      } else if (actionData.intent === 'delete') {
        toast.success(t('purchases.deleteSuccess', 'Закупівлю видалено'));
        navigate(`/dashboard/${orgId}/purchases`);
      } else if (actionData.intent === 'update') {
        toast.success(t('purchases.updateSuccess', 'Закупівлю оновлено'));
      } else if (actionData.intent === 'attach') {
        toast.success(t('purchases.attachSuccess', 'Закупівлю прикріплено до кампанії'));
      } else if (actionData.intent === 'upload') {
        toast.success(t('purchases.uploadSuccess', 'Документ завантажено'));
      } else if (actionData.intent === 'deleteDocument') {
        toast.success(t('purchases.deleteDocSuccess', 'Документ видалено'));
      } else if (actionData.intent === 'processOcr') {
        toast.success(t('purchases.ocrStarted', 'OCR запущено'));
      }
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData, navigate, t, orgId]);

  const onSave = (data: { title: string; totalAmount: number; status: string }) => {
    const formData = new FormData();
    formData.append('intent', 'savePurchase');
    formData.append('title', data.title);
    formData.append('totalAmount', String(Math.round(data.totalAmount * 100)));
    formData.append('status', data.status);
    submit(formData, { method: 'post' });
  };

  const onDelete = () => {
    if (!window.confirm(t('common.confirmDelete', 'Ви впевнені?'))) return;
    const formData = new FormData();
    formData.append('intent', 'deletePurchase');
    submit(formData, { method: 'post' });
  };

  const handleAttachPurchase = () => {
    if (!selectedAttachCampaignId) {
      toast.error(t('purchases.toasts.selectCampaignFirst', 'Спершу оберіть збір'));
      return;
    }
    const formData = new FormData();
    formData.append('intent', 'attachToCampaign');
    formData.append('campaignId', selectedAttachCampaignId);
    submit(formData, { method: 'post' });
    setIsAttachDialogOpen(false);
    setSelectedAttachCampaignId('');
  };

  const handleUpload = (file: File | null, type: DocumentType, clearFile: () => void) => {
    if (!file) return;
    if (isDocumentsLocked) {
      toast.error(t('purchases.documentsLockedBeforeCreate', 'Спочатку збережіть закупівлю'));
      return;
    }
    const formData = new FormData();
    formData.append('intent', 'uploadDocument');
    formData.append('file', file);
    formData.append('type', String(type));
    submit(formData, { method: 'post', encType: 'multipart/form-data' });
    clearFile();
  };

  const handleUploadDrop = (event: DragEvent<HTMLDivElement>, setFile: (file: File | null) => void) => {
    event.preventDefault();
    setActiveUploadHoverZone(null);
    if (isDocumentsLocked) {
      toast.error(t('purchases.documentsLockedBeforeCreate', 'Спочатку збережіть закупівлю'));
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) setFile(file);
  };

  const handleDeleteDocument = (docId: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    const formData = new FormData();
    formData.append('intent', 'deleteDocument');
    formData.append('documentId', docId);
    submit(formData, { method: 'post' });
  };

  const handleSaveDocumentMetadata = async (documentId: string, payload: any) => {
    const formData = new FormData();
    formData.append('intent', 'updateDocumentMetadata');
    formData.append('documentId', documentId);
    formData.append('payload', JSON.stringify(payload));
    submit(formData, { method: 'post' });
  };

  const handleRunDocumentOcr = (documentId: string, isRestricted: boolean, status: OcrProcessingStatus) => {
    if (isRestricted) {
      toast.error(t('purchases.ocrRestricted', 'OCR заборонено для цього типу'));
      return;
    }
    const confirmReprocess = status === OcrProcessingStatus.Success
      ? window.confirm(t('purchases.confirmRerunOcr', 'Документ вже розпізнано. Запустити OCR повторно?'))
      : true;
    if (!confirmReprocess) return;

    const formData = new FormData();
    formData.append('intent', 'processOcr');
    formData.append('documentId', documentId);
    submit(formData, { method: 'post' });
  };

  const handleAddWaybillItem = async (documentId: string, payload: any) => {
    const formData = new FormData();
    formData.append('intent', 'addWaybillItem');
    formData.append('documentId', documentId);
    formData.append('payload', JSON.stringify(payload));
    submit(formData, { method: 'post' });
  };

  const handleUpdateWaybillItem = async (documentId: string, itemId: string, payload: any) => {
    const formData = new FormData();
    formData.append('intent', 'updateWaybillItem');
    formData.append('documentId', documentId);
    formData.append('itemId', itemId);
    formData.append('payload', JSON.stringify(payload));
    submit(formData, { method: 'post' });
  };

  const handleDeleteWaybillItem = async (documentId: string, itemId: string) => {
    const formData = new FormData();
    formData.append('intent', 'deleteWaybillItem');
    formData.append('documentId', documentId);
    formData.append('itemId', itemId);
    submit(formData, { method: 'post' });
  };

  if (isPurchaseLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isNew && !purchase) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${orgId}/purchases`)} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Назад')}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('purchases.notFound', 'Закупівлю не знайдено')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSaving = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'savePurchase';
  const isPending = navigation.state === 'submitting';

  const receiptDocuments = purchase?.documents.filter((document) => document.type === DocumentType.BankReceipt) ?? [];
  const waybillDocuments = purchase?.documents.filter((document) => document.type === DocumentType.Waybill || document.type === DocumentType.Invoice) ?? [];
  const transferDocuments = purchase?.documents.filter((document) => document.type === DocumentType.TransferAct) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="purchase-detail-page">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${orgId}/purchases`)} className="-ml-3" data-testid="purchase-detail-back-button">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back', 'Назад')}
      </Button>

      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{isNew ? t('purchases.createNew', 'Нова закупівля') : t('purchases.editPurchase', 'Редагувати закупівлю')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="purchase-form" onSubmit={handleSubmit(onSave)} className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t('purchases.titleFields', 'Назва (опис)')}</Label>
                <Input id="title" {...register('title', { required: true })} placeholder={t('purchases.titlePlaceholder', 'Напр. 5 Мавіків')} data-testid="purchase-detail-title-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('purchases.statusFields', 'Статус')}</Label>
                <Select onValueChange={(val) => setValue('status', val)} defaultValue={String(purchase?.status ?? PurchaseStatus.PaymentSent)}>
                  <SelectTrigger data-testid="purchase-detail-status-trigger">
                    <SelectValue placeholder="Оберіть статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(PurchaseStatus.PaymentSent)}>{getPurchaseStatusLabel(PurchaseStatus.PaymentSent, t)}</SelectItem>
                    <SelectItem value={String(PurchaseStatus.PartiallyReceived)}>{getPurchaseStatusLabel(PurchaseStatus.PartiallyReceived, t)}</SelectItem>
                    <SelectItem value={String(PurchaseStatus.Completed)}>{getPurchaseStatusLabel(PurchaseStatus.Completed, t)}</SelectItem>
                    <SelectItem value={String(PurchaseStatus.Cancelled)}>{getPurchaseStatusLabel(PurchaseStatus.Cancelled, t)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2" data-testid="purchase-detail-total-amount-display">
                <Label>{t('purchases.computedAmount', 'Загальна сума закупівлі')}</Label>
                <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm font-semibold">
                  {new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'UAH' }).format((purchase?.totalAmount ?? 0) / 100)}
                </div>
                <p className="text-xs text-muted-foreground" data-testid="purchase-detail-total-amount-hint">
                  {t('purchases.computedAmountHint', 'Сума обчислюється автоматично: накладні (позиції) → квитанції → 0.')}
                </p>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-4">
            <Button type="button" variant="default" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete} disabled={isNew || isPending} data-testid="purchase-detail-delete-button">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
            <Button type="submit" form="purchase-form" disabled={isSubmitting || isSaving} data-testid="purchase-detail-save-button">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </CardFooter>
        </Card>

        {!isNew && purchase && !purchase.campaignId ? (
          <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="purchase-detail-draft-attach-card">
            <CardHeader>
              <CardTitle>{t('purchases.draftTitle', 'Draft закупівля')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground" data-testid="purchase-detail-draft-message">
                {t('purchases.draftDescription', 'Ця закупівля ще не прикріплена до збору.')}
              </p>
              <Button type="button" onClick={() => setIsAttachDialogOpen(true)} data-testid="purchase-detail-open-attach-campaign-dialog">
                {t('purchases.attachToCampaign', 'Прикріпити до збору')}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-6">
          {isDocumentsLocked ? (
            <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="purchase-documents-locked-card">
              <CardContent className="py-5 text-sm text-muted-foreground" data-testid="purchase-documents-locked-message">
                {t('purchases.documentsLockedBeforeCreate', 'Спочатку збережіть закупівлю')}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border border-border bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('purchases.documentsPanel', 'Документи закупівлі')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Receipts Section */}
              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-receipts-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.receiptsTitle', 'Блок квитанцій')}</p>
                </div>
                <div
                  data-testid="purchase-documents-receipts-dropzone"
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'receipts' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => { event.preventDefault(); setActiveUploadHoverZone('receipts'); }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setReceiptUploadFile)}
                >
                  <Input type="file" disabled={isDocumentsLocked} onChange={(event) => setReceiptUploadFile(event.target.files?.[0] ?? null)} />
                  {receiptUploadFile && <p className="mt-2 text-xs">{receiptUploadFile.name}</p>}
                </div>
                <Button onClick={() => handleUpload(receiptUploadFile, DocumentType.BankReceipt, () => setReceiptUploadFile(null))} disabled={isDocumentsLocked || !receiptUploadFile || isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {t('purchases.upload')}
                </Button>
                {receiptDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 border rounded-lg bg-background/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium truncate">{doc.originalFileName}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false, doc.ocrProcessingStatus)} disabled={isPending}>
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc.fileUrl, doc.originalFileName)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDocument(doc.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DocumentMetadataForm document={doc} onSubmit={handleSaveDocumentMetadata} isPending={isPending} t={t} />
                  </div>
                ))}
              </section>

              {/* Waybills Section */}
              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-waybills-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.waybillsTitle', 'Блок накладних')}</p>
                </div>
                <Select value={String(waybillUploadType)} onValueChange={(value) => setWaybillUploadType(Number(value) as DocumentType)} disabled={isDocumentsLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(DocumentType.Waybill)}>{getDocumentTypeLabel(DocumentType.Waybill, t)}</SelectItem>
                    <SelectItem value={String(DocumentType.Invoice)}>{getDocumentTypeLabel(DocumentType.Invoice, t)}</SelectItem>
                  </SelectContent>
                </Select>
                <div
                  data-testid="purchase-documents-waybills-dropzone"
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'waybills' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => { event.preventDefault(); setActiveUploadHoverZone('waybills'); }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setWaybillUploadFile)}
                >
                  <Input type="file" disabled={isDocumentsLocked} onChange={(event) => setWaybillUploadFile(event.target.files?.[0] ?? null)} />
                  {waybillUploadFile && <p className="mt-2 text-xs">{waybillUploadFile.name}</p>}
                </div>
                <Button onClick={() => handleUpload(waybillUploadFile, waybillUploadType, () => setWaybillUploadFile(null))} disabled={isDocumentsLocked || !waybillUploadFile || isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {t('purchases.upload')}
                </Button>
                {waybillDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 border rounded-lg bg-background/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium truncate">{doc.originalFileName}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false, doc.ocrProcessingStatus)} disabled={isPending}>
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc.fileUrl, doc.originalFileName)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDocument(doc.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DocumentMetadataForm
                      document={doc}
                      onSubmit={handleSaveDocumentMetadata}
                      onAddWaybillItem={handleAddWaybillItem}
                      onUpdateWaybillItem={handleUpdateWaybillItem}
                      onDeleteWaybillItem={handleDeleteWaybillItem}
                      isPending={isPending}
                      t={t}
                    />
                  </div>
                ))}
              </section>

              {/* Transfer Act Section */}
              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-transfer-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.transferTitle', 'Блок передачі')}</p>
                </div>
                <div
                  data-testid="purchase-documents-transfer-dropzone"
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'transfer' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => { event.preventDefault(); setActiveUploadHoverZone('transfer'); }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setTransferUploadFile)}
                >
                  <Input type="file" disabled={isDocumentsLocked} onChange={(event) => setTransferUploadFile(event.target.files?.[0] ?? null)} />
                  {transferUploadFile && <p className="mt-2 text-xs">{transferUploadFile.name}</p>}
                </div>
                <Button onClick={() => handleUpload(transferUploadFile, DocumentType.TransferAct, () => setTransferUploadFile(null))} disabled={isDocumentsLocked || !transferUploadFile || isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {t('purchases.upload')}
                </Button>
                {transferDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 border rounded-lg bg-background/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium truncate">{doc.originalFileName}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc.fileUrl, doc.originalFileName)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDocument(doc.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DocumentMetadataForm document={doc} onSubmit={handleSaveDocumentMetadata} isPending={isPending} t={t} />
                  </div>
                ))}
              </section>
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentPreviewDialog
        open={Boolean(previewDocument)}
        onOpenChange={(open) => { if (!open) setPreviewDocument(null); }}
        src={previewDocument?.src ?? null}
        title={previewDocument?.title ?? ''}
        testIdPrefix="purchase-detail-doc-preview"
      />

      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('purchases.attachToCampaign')}</DialogTitle></DialogHeader>
          <Select value={selectedAttachCampaignId} onValueChange={setSelectedAttachCampaignId}>
            <SelectTrigger><SelectValue placeholder={t('purchases.filters.selectCampaign')} /></SelectTrigger>
            <SelectContent>
              {activeCampaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.titleUk}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button onClick={handleAttachPurchase} disabled={isPending}>{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
