import { useState, useEffect, useMemo, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import {
  useCreateDraftPurchase,
  useAttachPurchaseToCampaign,
  useAddWaybillItem,
  usePurchaseDetailShort,
  useUpdatePurchaseShort,
  useDeletePurchaseShort,
  useUploadPurchaseDocumentShort,
  useUpdatePurchaseDocumentMetadataShort,
  useDeletePurchaseDocumentShort,
  useProcessPurchaseDocumentOcrShort,
  useUpdateWaybillItem,
  useDeleteWaybillItem,
} from '@/hooks/queries/usePurchases';
import { CampaignStatus, PurchaseStatus, DocumentType, OcrProcessingStatus, type DocumentDto } from '@/types';
import type { PurchaseStatus as PurchaseStatusType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Trash2, UploadCloud, Download, Sparkles, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentPreviewDialog } from '@/components/ui/document-preview-dialog';

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

function getOcrStatusLabel(status: OcrProcessingStatus, t: TFunction) {
  switch (status) {
    case OcrProcessingStatus.NotRequired:
      return t('purchases.ocrStatus.notRequired', 'OCR не потрібен');
    case OcrProcessingStatus.NotProcessed:
      return t('purchases.ocrStatus.notProcessed', 'OCR не запускали');
    case OcrProcessingStatus.Processing:
      return t('purchases.ocrStatus.processing', 'OCR у процесі');
    case OcrProcessingStatus.Success:
      return t('purchases.ocrStatus.success', 'OCR успішно');
    case OcrProcessingStatus.Failed:
      return t('purchases.ocrStatus.failed', 'OCR помилка');
    default:
      return t('purchases.ocrStatus.fallback', 'OCR статус {{status}}').replace('{{status}}', String(status));
  }
}

function getOcrBadgeVariant(status: OcrProcessingStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case OcrProcessingStatus.Success:
      return 'default';
    case OcrProcessingStatus.Failed:
      return 'destructive';
    case OcrProcessingStatus.Processing:
      return 'secondary';
    default:
      return 'outline';
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
    documentItems.map((item) => ({
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
    const sourceItem = documentItems.find((candidate) => candidate.id === editableItem.id);
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
      return editableItems.reduce((sum, item) => {
        const qty = Number(item.quantity.replace(',', '.'));
        const unit = Number(item.unitPrice.replace(',', '.'));
        if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty < 0 || unit < 0) {
          return sum;
        }

        return sum + (qty * unit);
      }, 0);
    }

    return documentItems.reduce((sum, item) => sum + (item.totalPrice / 100), 0);
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

      const targetItem = editableItems.find((item) => item.id === itemId);
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
              documentItems.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-14 items-center gap-2 rounded-md border border-border/50 bg-background p-2 text-xs" data-testid={`purchase-document-item-row-${item.id}`}>
                  <p className="md:col-span-5 truncate font-medium">{item.name}</p>
                  <p className="md:col-span-2 text-muted-foreground">{item.quantity}</p>
                  <p className="md:col-span-2 text-muted-foreground">{(item.unitPrice / 100).toFixed(2)} ₴</p>
                  <p className="md:col-span-2 md:text-right font-semibold">{(item.totalPrice / 100).toFixed(2)} ₴</p>
                </div>
              ))
            ) : (
              editableItems.map((editableItem) => {
                const item = documentItems.find((candidate) => candidate.id === editableItem.id);
                if (!item) {
                  return null;
                }

                return (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-14 items-center gap-2 rounded-md border border-border/50 bg-background p-2 text-xs" data-testid={`purchase-document-item-row-${item.id}`}>
                    <div className="md:col-span-5">
                      <Input value={editableItem.name} onChange={(event) => setEditableItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, name: event.target.value } : candidate))} data-testid={`purchase-document-item-name-${item.id}`} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" step="0.001" min="0" value={editableItem.quantity} onChange={(event) => setEditableItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, quantity: event.target.value } : candidate))} data-testid={`purchase-document-item-quantity-${item.id}`} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" step="0.01" min="0" value={editableItem.unitPrice} onChange={(event) => setEditableItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, unitPrice: event.target.value } : candidate))} data-testid={`purchase-document-item-unit-price-${item.id}`} />
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

export default function OrganizationPurchaseDetailPage() {
  const { t, i18n } = useTranslation();
  const { orgId, purchaseId } = useParams<{ orgId: string; purchaseId?: string }>();
  const navigate = useNavigate();
  const isNew = !purchaseId || purchaseId === 'new';
  const isDocumentsLocked = isNew || !purchaseId || purchaseId === 'new';

  const { data: campaigns = [] } = useCampaigns(orgId);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === CampaignStatus.Active);

  const { data: purchase, isLoading: isPurchaseLoading } = usePurchaseDetailShort(
    orgId!,
    purchaseId ?? '',
    Boolean(purchaseId) && !isNew
  );

  const createDraftPurchase = useCreateDraftPurchase();
  const attachPurchaseToCampaign = useAttachPurchaseToCampaign();
  const addWaybillItem = useAddWaybillItem();
  const updateWaybillItem = useUpdateWaybillItem();
  const deleteWaybillItem = useDeleteWaybillItem();
  const updatePurchase = useUpdatePurchaseShort();
  const deletePurchase = useDeletePurchaseShort();
  const uploadDocument = useUploadPurchaseDocumentShort();
  const updateDocumentMetadata = useUpdatePurchaseDocumentMetadataShort();
  const deleteDocument = useDeletePurchaseDocumentShort();
  const processDocumentOcr = useProcessPurchaseDocumentOcrShort();

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      status: String(PurchaseStatus.PaymentSent),
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
    if (!fileUrl) {
      return;
    }

    setPreviewDocument({ src: fileUrl, title: originalFileName, fileName: originalFileName });
  };

  useEffect(() => {
    if (purchase) {
      reset({
        title: purchase.title,
        status: String(purchase.status),
      });
    }
  }, [purchase, reset]);

  const onSubmit = async (data: { title: string; status: string }) => {
    try {
      if (isNew) {
        const created = await createDraftPurchase.mutateAsync({
          organizationId: orgId!,
          title: data.title,
          description: null,
        });
        toast.success(t('purchases.createSuccess', 'Закупівлю створено'));
        navigate(`/dashboard/${orgId}/purchases/${created.id}`);
      } else {
        await updatePurchase.mutateAsync({
          organizationId: orgId!,
          purchaseId: purchaseId!,
          payload: { title: data.title, status: Number(data.status) as PurchaseStatusType },
        });
        toast.success(t('purchases.updateSuccess', 'Закупівлю оновлено'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleUpload = async (file: File | null, type: DocumentType, clearFile: () => void) => {
    if (!file || !purchaseId || isDocumentsLocked) {
      if (isDocumentsLocked) {
        toast.error(t('purchases.documentsLockedBeforeCreate', 'Спочатку збережіть закупівлю, а потім завантажуйте документи.'));
      }
      return;
    }

    try {
      await uploadDocument.mutateAsync({
        organizationId: orgId!,
        purchaseId: purchaseId,
        file,
        type,
      });
      clearFile();
      toast.success(t('purchases.uploadSuccess', 'Документ завантажено'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleUploadDrop = (event: DragEvent<HTMLDivElement>, setFile: (file: File | null) => void) => {
    event.preventDefault();
    setActiveUploadHoverZone(null);

    if (isDocumentsLocked) {
      toast.error(t('purchases.documentsLockedBeforeCreate', 'Спочатку збережіть закупівлю, а потім завантажуйте документи.'));
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    setFile(file);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!purchaseId) return;
    try {
      await deleteDocument.mutateAsync({
        organizationId: orgId!,
        purchaseId: purchaseId,
        documentId: docId,
      });
      toast.success(t('purchases.deleteDocSuccess', 'Документ видалено'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleSaveDocumentMetadata = async (
    documentId: string,
    payload: {
      amount?: number;
      counterpartyName?: string;
      documentDate?: string;
      edrpou?: string;
      payerFullName?: string;
      receiptCode?: string;
      paymentPurpose?: string;
      senderIban?: string;
      receiverIban?: string;
    },
  ) => {
    if (!purchaseId) {
      return;
    }

    try {
      await updateDocumentMetadata.mutateAsync({
        organizationId: orgId!,
        purchaseId,
        documentId,
        payload,
      });
      toast.success(t('purchases.metadataSaved', 'Метадані документа оновлено'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleRunDocumentOcr = async (
    documentId: string,
    isRestricted: boolean,
    status: OcrProcessingStatus,
  ) => {
    if (!purchaseId) {
      return;
    }

    if (isRestricted) {
      toast.error(t('purchases.ocrRestricted', 'OCR заборонено для цього типу'));
      return;
    }

    const confirmReprocess = status === OcrProcessingStatus.Success
      ? window.confirm(t('purchases.confirmRerunOcr', 'Документ вже розпізнано. Запустити OCR повторно?'))
      : false;

    if (status === OcrProcessingStatus.Success && !confirmReprocess) {
      return;
    }

    try {
      await processDocumentOcr.mutateAsync({
        organizationId: orgId!,
        purchaseId,
        documentId,
        confirmReprocess,
      });
      toast.success(t('purchases.ocrStarted', 'OCR запущено'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleDeletePurchase = async () => {
    if (!purchaseId || isNew || !confirm(t('purchases.deleteConfirm', 'Видалити цю закупівлю та всі прив\'язані документи?'))) return;
    
    try {
      await deletePurchase.mutateAsync({
        organizationId: orgId!,
        purchaseId: purchaseId,
      });
      toast.success(t('purchases.deleteSuccess', 'Закупівлю видалено'));
      navigate(`/dashboard/${orgId}/purchases`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleAttachPurchase = async () => {
    if (!purchaseId || !selectedAttachCampaignId) {
      toast.error(t('purchases.toasts.selectCampaignFirst', 'Спершу оберіть збір'));
      return;
    }

    try {
      await attachPurchaseToCampaign.mutateAsync({
        purchaseId,
        payload: { campaignId: selectedAttachCampaignId },
      });
      setIsAttachDialogOpen(false);
      setSelectedAttachCampaignId('');
      toast.success(t('purchases.attachSuccess', 'Закупівлю прикріплено до збору'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleAddWaybillItem = async (
    documentId: string,
    payload: { name: string; quantity: number; unitPrice: number },
  ) => {
    try {
      await addWaybillItem.mutateAsync({ documentId, payload });
      toast.success(t('purchases.items.addSuccess', 'Позицію додано'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleUpdateWaybillItem = async (
    documentId: string,
    itemId: string,
    payload: { name: string; quantity: number; unitPrice: number },
  ) => {
    try {
      await updateWaybillItem.mutateAsync({ documentId, itemId, payload });
      toast.success(t('purchases.items.updateSuccess', 'Позицію оновлено'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleDeleteWaybillItem = async (documentId: string, itemId: string) => {
    try {
      await deleteWaybillItem.mutateAsync({ documentId, itemId });
      toast.success(t('purchases.items.deleteSuccess', 'Позицію видалено'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
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
        {/* Main Form */}
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{isNew ? t('purchases.createNew', 'Нова закупівля') : t('purchases.editPurchase', 'Редагувати закупівлю')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
            <Button type="button" variant="default" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePurchase} disabled={isNew || deletePurchase.isPending} data-testid="purchase-detail-delete-button">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
            <Button type="submit" form="purchase-form" disabled={isSubmitting || createDraftPurchase.isPending} data-testid="purchase-detail-save-button">
              {(isSubmitting || createDraftPurchase.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                {t('purchases.draftDescription', 'Ця закупівля ще не прикріплена до збору. Прикріпіть її, щоб відображати в межах кампанії.')}
              </p>
              <Button type="button" onClick={() => setIsAttachDialogOpen(true)} data-testid="purchase-detail-open-attach-campaign-dialog">
                {t('purchases.attachToCampaign', 'Прикріпити до збору')}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Documents Panel */}
        <div className="space-y-6">
          {isDocumentsLocked ? (
            <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="purchase-documents-locked-card">
              <CardContent className="py-5 text-sm text-muted-foreground" data-testid="purchase-documents-locked-message">
                {t('purchases.documentsLockedBeforeCreate', 'Спочатку збережіть закупівлю, а потім завантажуйте документи.')}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border border-border bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('purchases.documentsPanel', 'Документи закупівлі')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-receipts-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.receiptsTitle', 'Блок квитанцій')}</p>
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.receiptsDescription', 'Банківські квитанції з OCR-розпізнаванням.')}</p>
                </div>

                <div
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'receipts' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => {
                    if (isDocumentsLocked) {
                      return;
                    }
                    event.preventDefault();
                    setActiveUploadHoverZone('receipts');
                  }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setReceiptUploadFile)}
                  data-testid="purchase-documents-receipts-dropzone"
                >
                  <p className="mb-2 text-xs text-muted-foreground">{t('purchases.uploadDropHint', 'Перетягніть файл сюди або оберіть вручну')}</p>
                  <Input type="file" disabled={isDocumentsLocked} onChange={(event) => setReceiptUploadFile(event.target.files?.[0] ?? null)} data-testid="purchase-documents-receipts-file-input" />
                  {receiptUploadFile ? <p className="mt-2 truncate text-xs text-foreground">{receiptUploadFile.name}</p> : null}
                </div>

                <Button
                  type="button"
                  onClick={() => handleUpload(receiptUploadFile, DocumentType.BankReceipt, () => setReceiptUploadFile(null))}
                  disabled={isDocumentsLocked || !receiptUploadFile || uploadDocument.isPending}
                  data-testid="purchase-documents-receipts-upload-button"
                >
                  {uploadDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <UploadCloud className="h-4 w-4 md:mr-2" />}
                  <span>{t('purchases.upload', 'Завантажити')}</span>
                </Button>

                {receiptDocuments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.empty', 'Документи ще не додані')}</p>
                ) : (
                  receiptDocuments.map((doc) => (
                    <div key={doc.id} className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3" data-testid={`purchase-document-card-${doc.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{doc.originalFileName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{getDocumentTypeLabel(doc.type, t)}</Badge>
                            <Badge variant={getOcrBadgeVariant(doc.ocrProcessingStatus)} className="text-[10px]" data-testid={`purchase-document-ocr-status-${doc.id}`}>
                              {getOcrStatusLabel(doc.ocrProcessingStatus, t)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false, doc.ocrProcessingStatus)} disabled={processDocumentOcr.isPending} data-testid={`purchase-document-ocr-button-${doc.id}`}>
                            <Sparkles className="h-4 w-4" />
                            {doc.ocrProcessingStatus === OcrProcessingStatus.Success
                              ? t('purchases.blocks.rerunOcr', 'Повторити OCR')
                              : t('purchases.blocks.runOcr', 'Запустити OCR')}
                          </Button>
                          {doc.fileUrl ? (
                            <Button type="button" variant="ghost" size="icon" onClick={() => openDocumentPreview(doc.fileUrl, doc.originalFileName)} data-testid={`purchase-document-preview-${doc.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {doc.fileUrl ? (
                            <Button variant="ghost" size="icon" asChild data-testid={`purchase-document-download-${doc.id}`}>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteDocument(doc.id)} disabled={deleteDocument.isPending} data-testid={`purchase-document-delete-${doc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <DocumentMetadataForm
                        key={`${doc.id}-${doc.amount ?? 'n'}-${doc.counterpartyName ?? 'n'}-${doc.documentDate ?? 'n'}-${doc.items?.map((item) => `${item.id}:${item.name}:${item.quantity}:${item.unitPrice}`).join('|') ?? 'n'}-${doc.edrpou ?? 'n'}-${doc.payerFullName ?? 'n'}-${doc.receiptCode ?? 'n'}-${doc.paymentPurpose ?? 'n'}-${doc.senderIban ?? 'n'}-${doc.receiverIban ?? 'n'}`}
                        document={doc}
                        onSubmit={handleSaveDocumentMetadata}
                        onAddWaybillItem={handleAddWaybillItem}
                        onUpdateWaybillItem={handleUpdateWaybillItem}
                        onDeleteWaybillItem={handleDeleteWaybillItem}
                        isPending={updateDocumentMetadata.isPending || addWaybillItem.isPending || updateWaybillItem.isPending || deleteWaybillItem.isPending}
                        t={t}
                      />
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-waybills-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.waybillsTitle', 'Блок накладних')}</p>
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.waybillsDescription', 'Видаткові накладні та рахунки з OCR.')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t('purchases.docType', 'Тип документу')}</Label>
                  <Select value={String(waybillUploadType)} onValueChange={(value) => setWaybillUploadType(Number(value) as DocumentType)} disabled={isDocumentsLocked}>
                    <SelectTrigger data-testid="purchase-documents-waybills-type-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(DocumentType.Waybill)}>{getDocumentTypeLabel(DocumentType.Waybill, t)}</SelectItem>
                      <SelectItem value={String(DocumentType.Invoice)}>{getDocumentTypeLabel(DocumentType.Invoice, t)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'waybills' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => {
                    if (isDocumentsLocked) {
                      return;
                    }
                    event.preventDefault();
                    setActiveUploadHoverZone('waybills');
                  }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setWaybillUploadFile)}
                  data-testid="purchase-documents-waybills-dropzone"
                >
                  <p className="mb-2 text-xs text-muted-foreground">{t('purchases.uploadDropHint', 'Перетягніть файл сюди або оберіть вручну')}</p>
                  <Input type="file" disabled={isDocumentsLocked} onChange={(event) => setWaybillUploadFile(event.target.files?.[0] ?? null)} data-testid="purchase-documents-waybills-file-input" />
                  {waybillUploadFile ? <p className="mt-2 truncate text-xs text-foreground">{waybillUploadFile.name}</p> : null}
                </div>

                <Button
                  type="button"
                  onClick={() => handleUpload(waybillUploadFile, waybillUploadType, () => setWaybillUploadFile(null))}
                  disabled={isDocumentsLocked || !waybillUploadFile || uploadDocument.isPending}
                  data-testid="purchase-documents-waybills-upload-button"
                >
                  {uploadDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <UploadCloud className="h-4 w-4 md:mr-2" />}
                  <span>{t('purchases.upload', 'Завантажити')}</span>
                </Button>

                {waybillDocuments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.empty', 'Документи ще не додані')}</p>
                ) : (
                  waybillDocuments.map((doc) => (
                    <div key={doc.id} className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3" data-testid={`purchase-document-card-${doc.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{doc.originalFileName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{getDocumentTypeLabel(doc.type, t)}</Badge>
                            <Badge variant={getOcrBadgeVariant(doc.ocrProcessingStatus)} className="text-[10px]" data-testid={`purchase-document-ocr-status-${doc.id}`}>
                              {getOcrStatusLabel(doc.ocrProcessingStatus, t)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false, doc.ocrProcessingStatus)} disabled={processDocumentOcr.isPending} data-testid={`purchase-document-ocr-button-${doc.id}`}>
                            <Sparkles className="h-4 w-4" />
                            {doc.ocrProcessingStatus === OcrProcessingStatus.Success
                              ? t('purchases.blocks.rerunOcr', 'Повторити OCR')
                              : t('purchases.blocks.runOcr', 'Запустити OCR')}
                          </Button>
                          {doc.fileUrl ? (
                            <Button type="button" variant="ghost" size="icon" onClick={() => openDocumentPreview(doc.fileUrl, doc.originalFileName)} data-testid={`purchase-document-preview-${doc.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {doc.fileUrl ? (
                            <Button variant="ghost" size="icon" asChild data-testid={`purchase-document-download-${doc.id}`}>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteDocument(doc.id)} disabled={deleteDocument.isPending} data-testid={`purchase-document-delete-${doc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <DocumentMetadataForm
                        key={`${doc.id}-${doc.amount ?? 'n'}-${doc.counterpartyName ?? 'n'}-${doc.documentDate ?? 'n'}-${doc.items?.map((item) => `${item.id}:${item.name}:${item.quantity}:${item.unitPrice}`).join('|') ?? 'n'}-${doc.edrpou ?? 'n'}-${doc.payerFullName ?? 'n'}-${doc.receiptCode ?? 'n'}-${doc.paymentPurpose ?? 'n'}-${doc.senderIban ?? 'n'}-${doc.receiverIban ?? 'n'}`}
                        document={doc}
                        onSubmit={handleSaveDocumentMetadata}
                        onAddWaybillItem={handleAddWaybillItem}
                        onUpdateWaybillItem={handleUpdateWaybillItem}
                        onDeleteWaybillItem={handleDeleteWaybillItem}
                        isPending={updateDocumentMetadata.isPending || addWaybillItem.isPending || updateWaybillItem.isPending || deleteWaybillItem.isPending}
                        t={t}
                      />
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-transfer-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.transferTitle', 'Блок передачі (optional)')}</p>
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.transferDescription', 'Акти прийому-передачі. OCR обмежено з міркувань безпеки.')}</p>
                </div>

                <div
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'transfer' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => {
                    if (isDocumentsLocked) {
                      return;
                    }
                    event.preventDefault();
                    setActiveUploadHoverZone('transfer');
                  }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setTransferUploadFile)}
                  data-testid="purchase-documents-transfer-dropzone"
                >
                  <p className="mb-2 text-xs text-muted-foreground">{t('purchases.uploadDropHint', 'Перетягніть файл сюди або оберіть вручну')}</p>
                  <Input type="file" disabled={isDocumentsLocked} onChange={(event) => setTransferUploadFile(event.target.files?.[0] ?? null)} data-testid="purchase-documents-transfer-file-input" />
                  {transferUploadFile ? <p className="mt-2 truncate text-xs text-foreground">{transferUploadFile.name}</p> : null}
                </div>

                <Button
                  type="button"
                  onClick={() => handleUpload(transferUploadFile, DocumentType.TransferAct, () => setTransferUploadFile(null))}
                  disabled={isDocumentsLocked || !transferUploadFile || uploadDocument.isPending}
                  data-testid="purchase-documents-transfer-upload-button"
                >
                  {uploadDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <UploadCloud className="h-4 w-4 md:mr-2" />}
                  <span>{t('purchases.upload', 'Завантажити')}</span>
                </Button>

                {transferDocuments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.empty', 'Документи ще не додані')}</p>
                ) : (
                  transferDocuments.map((doc) => (
                    <div key={doc.id} className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3" data-testid={`purchase-document-card-${doc.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{doc.originalFileName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{getDocumentTypeLabel(doc.type, t)}</Badge>
                            <Badge variant={getOcrBadgeVariant(doc.ocrProcessingStatus)} className="text-[10px]" data-testid={`purchase-document-ocr-status-${doc.id}`}>
                              {getOcrStatusLabel(doc.ocrProcessingStatus, t)}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
                              {t('purchases.ocrRestricted', 'OCR заборонено для цього типу')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="outline" size="sm" disabled data-testid={`purchase-document-ocr-button-${doc.id}`}>
                            <Sparkles className="h-4 w-4" />
                            {t('purchases.blocks.runOcr', 'Запустити OCR')}
                          </Button>
                          {doc.fileUrl ? (
                            <Button type="button" variant="ghost" size="icon" onClick={() => openDocumentPreview(doc.fileUrl, doc.originalFileName)} data-testid={`purchase-document-preview-${doc.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {doc.fileUrl ? (
                            <Button variant="ghost" size="icon" asChild data-testid={`purchase-document-download-${doc.id}`}>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteDocument(doc.id)} disabled={deleteDocument.isPending} data-testid={`purchase-document-delete-${doc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <DocumentMetadataForm document={doc} onSubmit={handleSaveDocumentMetadata} isPending={updateDocumentMetadata.isPending} t={t} />
                    </div>
                  ))
                )}
              </section>

              {!(purchase?.documents.length ?? 0) ? (
                <p className="border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">{t('purchases.noDocuments', 'Документів ще немає')}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentPreviewDialog
        open={Boolean(previewDocument)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDocument(null);
          }
        }}
        src={previewDocument?.src ?? null}
        title={previewDocument?.title ?? ''}
        fileName={previewDocument?.fileName}
        mimeType={previewDocument?.mimeType}
        description={previewDocument?.fileName}
        testIdPrefix="purchase-document-preview"
      />

      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent data-testid="purchase-detail-attach-campaign-dialog">
          <DialogHeader>
            <DialogTitle>{t('purchases.attachToCampaign', 'Прикріпити до збору')}</DialogTitle>
            <DialogDescription>{t('purchases.attachDescription', 'Оберіть активний збір, до якого потрібно прикріпити закупівлю.')}</DialogDescription>
          </DialogHeader>

          <Select value={selectedAttachCampaignId} onValueChange={setSelectedAttachCampaignId}>
            <SelectTrigger data-testid="purchase-detail-attach-campaign-select-trigger">
              <SelectValue placeholder={t('purchases.filters.selectCampaign', 'Оберіть збір')} />
            </SelectTrigger>
            <SelectContent>
              {activeCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id} data-testid={`purchase-detail-attach-campaign-option-${campaign.id}`}>
                  {campaign.titleUk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end">
            <Button type="button" onClick={handleAttachPurchase} disabled={attachPurchaseToCampaign.isPending} data-testid="purchase-detail-attach-campaign-submit-button">
              {attachPurchaseToCampaign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
