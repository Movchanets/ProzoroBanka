import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import type { DocumentDto, UpdateDocumentMetadataRequest } from '@/types';
import { DocumentType } from '@/types';
import type { TFunction } from 'i18next';

interface DocumentMetadataFormProps {
  document: DocumentDto;
  onSubmit: (documentId: string, payload: UpdateDocumentMetadataRequest) => Promise<void>;
  onAddWaybillItem?: (documentId: string) => Promise<void>;
  onUpdateWaybillItem?: (documentId: string, itemId: string, name: string, quantity: number, unitPrice: number) => Promise<void>;
  onDeleteWaybillItem?: (documentId: string, itemId: string) => Promise<void>;
  isPending: boolean;
  t: TFunction;
}

export function DocumentMetadataForm({
  document,
  onSubmit,
  onAddWaybillItem,
  onUpdateWaybillItem,
  onDeleteWaybillItem,
  isPending: isPendingProp,
  t,
}: DocumentMetadataFormProps) {
  const isPending = isPendingProp;
  
  const { register, handleSubmit, reset } = useForm<UpdateDocumentMetadataRequest>({
    defaultValues: {
      amount: document.amount ? document.amount / 100 : 0,
      counterpartyName: document.counterpartyName ?? '',
      documentDate: document.documentDate ? document.documentDate.split('T')[0] : '',
      edrpou: (document as any).edrpou ?? '',
      payerFullName: (document as any).payerFullName ?? '',
      receiptCode: (document as any).receiptCode ?? '',
      paymentPurpose: (document as any).paymentPurpose ?? '',
      senderIban: (document as any).senderIban ?? '',
      receiverIban: (document as any).receiverIban ?? '',
    },
  });

  useEffect(() => {
    reset({
      amount: document.amount ? document.amount / 100 : 0,
      counterpartyName: document.counterpartyName ?? '',
      documentDate: document.documentDate ? document.documentDate.split('T')[0] : '',
      edrpou: (document as any).edrpou ?? '',
      payerFullName: (document as any).payerFullName ?? '',
      receiptCode: (document as any).receiptCode ?? '',
      paymentPurpose: (document as any).paymentPurpose ?? '',
      senderIban: (document as any).senderIban ?? '',
      receiverIban: (document as any).receiverIban ?? '',
    });
  }, [document.id, document.ocrProcessingStatus, reset]);

  const isWaybill = document.type === DocumentType.Waybill || document.type === DocumentType.Invoice;

  const onFormSubmit = async (data: UpdateDocumentMetadataRequest) => {
    console.log(`[DocumentMetadataForm] onFormSubmit for docId: ${document.id}`, data);
    const payload = {
      ...data,
      amount: data.amount ? Math.round(data.amount * 100) : 0,
    };
    await onSubmit(document.id, payload);
    console.log(`[DocumentMetadataForm] onSubmit finished for docId: ${document.id}`);
  };

  const handleManualSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log(`[DocumentMetadataForm] Manual save button clicked for docId: ${document.id}`);
    handleSubmit(onFormSubmit, (errors) => {
      console.error(`[DocumentMetadataForm] Validation errors for docId: ${document.id}:`, errors);
    })();
  };

  return (
    <div className="space-y-4 mt-2" data-testid={`purchase-document-metadata-form-${document.id}`}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onFormSubmit)();
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div className="space-y-1">
          <Label className="text-xs">{t('purchases.docFields.counterparty', 'Контрагент')}</Label>
          <Input 
            size={1} 
            className="h-8 text-xs" 
            {...register('counterpartyName')} 
            data-testid={`purchase-document-counterparty-input-${document.id}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('purchases.docFields.amount', 'Сума')}</Label>
          <Input 
            size={1} 
            className="h-8 text-xs" 
            type="number" 
            step="0.01"
            {...register('amount', { valueAsNumber: true })} 
            data-testid={`purchase-document-amount-input-${document.id}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('purchases.docFields.date', 'Дата')}</Label>
          <Input 
            size={1} 
            className="h-8 text-xs" 
            type="date" 
            {...register('documentDate')} 
            data-testid={`purchase-document-date-input-${document.id}`}
          />
        </div>
        
        {document.type === DocumentType.BankReceipt && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">{t('purchases.docFields.edrpou', 'ЄДРПОУ')}</Label>
              <Input 
                size={1} 
                className="h-8 text-xs" 
                {...register('edrpou')} 
                data-testid={`purchase-document-edrpou-input-${document.id}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('purchases.docFields.payer', 'Платник')}</Label>
              <Input 
                size={1} 
                className="h-8 text-xs" 
                {...register('payerFullName')} 
                data-testid={`purchase-document-payer-full-name-input-${document.id}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('purchases.docFields.receiptCode', 'Код квитанції')}</Label>
              <Input 
                size={1} 
                className="h-8 text-xs" 
                {...register('receiptCode')} 
                data-testid={`purchase-document-receipt-code-input-${document.id}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('purchases.docFields.purpose', 'Призначення')}</Label>
              <Input 
                size={1} 
                className="h-8 text-xs" 
                {...register('paymentPurpose')} 
                data-testid={`purchase-document-payment-purpose-input-${document.id}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('purchases.docFields.senderIban', 'IBAN відправника')}</Label>
              <Input 
                size={1} 
                className="h-8 text-xs" 
                {...register('senderIban')} 
                data-testid={`purchase-document-sender-iban-input-${document.id}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('purchases.docFields.receiverIban', 'IBAN отримувача')}</Label>
              <Input 
                size={1} 
                className="h-8 text-xs" 
                {...register('receiverIban')} 
                data-testid={`purchase-document-receiver-iban-input-${document.id}`}
              />
            </div>
          </>
        )}

        <div className="md:col-span-2 flex justify-end">
          <Button 
            type="button" 
            size="sm"
            disabled={isPending} 
            data-testid={`purchase-document-save-metadata-${document.id}`}
            onClick={handleManualSubmit}
          >
            {t('common.save', 'Зберегти зміни')}
          </Button>
        </div>
      </form>

      {isWaybill && onAddWaybillItem && (
        <div className="space-y-2 border-t pt-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-semibold">{t('purchases.itemsTitle', 'Позиції в накладній')}</h4>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAddWaybillItem(document.id)} disabled={isPending}>
              <Plus className="h-3 w-3 mr-1" />
              {t('common.add', 'Додати')}
            </Button>
          </div>
          <div className="space-y-2" data-testid={`purchase-document-items-list-${document.id}`}>
            {document.items?.map((item) => (
              <div key={item.id} className="flex gap-2 items-end" data-testid={`purchase-document-item-row-${item.id}`}>
                <div className="flex-1 space-y-1">
                  <Input
                    size={1}
                    className="h-7 text-xs"
                    defaultValue={item.name}
                    onBlur={(e) => onUpdateWaybillItem?.(document.id, item.id, e.target.value, item.quantity, item.unitPrice)}
                    disabled={isPending}
                    data-testid={`purchase-document-item-name-${item.id}`}
                  />
                </div>
                <div className="w-16 space-y-1">
                  <Input
                    size={1}
                    className="h-7 text-xs"
                    type="number"
                    step="0.0001"
                    defaultValue={item.quantity}
                    onBlur={(e) => onUpdateWaybillItem?.(document.id, item.id, item.name, Number(e.target.value), item.unitPrice)}
                    disabled={isPending}
                    data-testid={`purchase-document-item-quantity-${item.id}`}
                  />
                </div>
                <div className="w-24 space-y-1" key={`${item.id}-${item.unitPrice}`}>
                  <Input
                    size={1}
                    className="h-7 text-xs"
                    type="number"
                    step="0.01"
                    defaultValue={item.unitPrice / 100}
                    onBlur={(e) => onUpdateWaybillItem?.(document.id, item.id, item.name, item.quantity, Math.round(Number(e.target.value) * 100))}
                    disabled={isPending}
                    data-testid={`purchase-document-item-unit-price-${item.id}`}
                  />
                </div>
                <div className="w-24 pb-1.5 text-xs text-right font-medium">
                  {(item.quantity * item.unitPrice / 100).toFixed(2)} ₴
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => onDeleteWaybillItem?.(document.id, item.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
