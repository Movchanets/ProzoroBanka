import { useState, useEffect, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import {
  usePurchaseDetailShort,
  useUpdatePurchaseShort,
  useDeletePurchaseShort,
  useUploadPurchaseDocumentShort,
  useUpdatePurchaseDocumentMetadataShort,
  useDeletePurchaseDocumentShort,
  useProcessPurchaseDocumentOcrShort,
} from '@/hooks/queries/usePurchases';
import type { PurchaseStatus as PurchaseStatusType, DocumentType as DocumentTypeType } from '@/types';
import { PurchaseStatus, DocumentType, OcrProcessingStatus, type DocumentDto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Trash2, UploadCloud, Download, Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';

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
  isPending,
  t,
}: {
  document: DocumentDto;
  onSubmit: (documentId: string, payload: { amount?: number; counterpartyName?: string; documentDate?: string }) => Promise<void>;
  isPending: boolean;
  t: TFunction;
}) {
  const [amount, setAmount] = useState(document.amount ? (document.amount / 100).toFixed(2) : '');
  const [counterpartyName, setCounterpartyName] = useState(document.counterpartyName ?? '');
  const [documentDate, setDocumentDate] = useState(document.documentDate ? document.documentDate.slice(0, 10) : '');

  const handleSave = async () => {
    const normalizedAmount = amount.trim().length > 0 ? Number(amount.replace(',', '.')) : undefined;

    await onSubmit(document.id, {
      amount: Number.isFinite(normalizedAmount) ? Math.round((normalizedAmount ?? 0) * 100) : undefined,
      counterpartyName: counterpartyName.trim() || undefined,
      documentDate: documentDate || undefined,
    });
  };

  if (document.type === DocumentType.Waybill || document.type === DocumentType.Invoice) {
    return (
      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3" data-testid={`purchase-document-metadata-form-${document.id}`}>
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t('purchases.items.listTitle', 'Позиції з документа')}</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2" data-testid={`purchase-document-mocked-items-${document.id}`}>
            {[1, 2, 3].map((_, idx) => (
              <div key={idx} className="flex gap-2 items-end bg-background p-2 rounded-md border border-border/50 text-xs">
                 <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('purchases.items.itemName', 'Назва товару')}</Label>
                    <Input defaultValue={`Товар ${idx + 1}`} className="h-7 text-xs" />
                 </div>
                 <div className="w-16 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('purchases.items.qty', 'К-сть')}</Label>
                    <Input defaultValue="10" type="number" className="h-7 text-xs px-2" />
                 </div>
                 <div className="w-20 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('purchases.items.price', 'Ціна (₴)')}</Label>
                    <Input defaultValue="1500" type="number" className="h-7 text-xs px-2" />
                 </div>
                 <div className="w-24 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('purchases.items.total', 'Сума (₴)')}</Label>
                    <Input defaultValue="15000" type="number" readOnly className="h-7 text-xs bg-muted px-2" />
                 </div>
              </div>
            ))}
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
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
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
  const { t } = useTranslation();
  const { orgId, purchaseId } = useParams<{ orgId: string; purchaseId: string }>();
  const navigate = useNavigate();

  const { data: purchase, isLoading: isPurchaseLoading } = usePurchaseDetailShort(
    orgId!,
    purchaseId ?? '',
    Boolean(purchaseId)
  );

  const updatePurchase = useUpdatePurchaseShort();
  const deletePurchase = useDeletePurchaseShort();
  const uploadDocument = useUploadPurchaseDocumentShort();
  const updateDocumentMetadata = useUpdatePurchaseDocumentMetadataShort();
  const deleteDocument = useDeletePurchaseDocumentShort();
  const processDocumentOcr = useProcessPurchaseDocumentOcrShort();

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      totalAmountStr: '',
      status: String(PurchaseStatus.PaymentSent),
    },
  });

  const [receiptUploadFile, setReceiptUploadFile] = useState<File | null>(null);
  const [waybillUploadFile, setWaybillUploadFile] = useState<File | null>(null);
  const [transferUploadFile, setTransferUploadFile] = useState<File | null>(null);
  const [waybillUploadType, setWaybillUploadType] = useState<DocumentType>(DocumentType.Waybill);
  const [activeUploadHoverZone, setActiveUploadHoverZone] = useState<string | null>(null);

  useEffect(() => {
    if (purchase) {
      reset({
        title: purchase.title,
        totalAmountStr: (purchase.totalAmount / 100).toFixed(2),
        status: String(purchase.status),
      });
    }
  }, [purchase, reset]);

  const onSubmit = async (data: { title: string; totalAmountStr: string; status: string }) => {
    const totalAmount = Math.round(Number(data.totalAmountStr.replace(',', '.')) * 100);

    try {
      await updatePurchase.mutateAsync({
        organizationId: orgId!,
        purchaseId: purchaseId!,
        payload: { title: data.title, totalAmount, status: Number(data.status) as PurchaseStatusType },
      });
      toast.success(t('purchases.updateSuccess', 'Закупівлю оновлено'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleUpload = async (file: File | null, type: DocumentType, clearFile: () => void) => {
    if (!file || !purchaseId) return;

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
    payload: { amount?: number; counterpartyName?: string; documentDate?: string },
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

  const handleRunDocumentOcr = async (documentId: string, isRestricted: boolean) => {
    if (!purchaseId) {
      return;
    }

    if (isRestricted) {
      toast.error(t('purchases.ocrRestricted', 'OCR заборонено для цього типу'));
      return;
    }

    try {
      await processDocumentOcr.mutateAsync({
        organizationId: orgId!,
        purchaseId,
        documentId,
      });
      toast.success(t('purchases.ocrStarted', 'OCR запущено'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    }
  };

  const handleDeletePurchase = async () => {
    if (!purchaseId || !confirm(t('purchases.deleteConfirm', 'Видалити цю закупівлю та всі прив\'язані документи?'))) return;
    
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

  if (isPurchaseLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!purchase) {
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

  const receiptDocuments = purchase.documents.filter((document) => document.type === DocumentType.BankReceipt);
  const waybillDocuments = purchase.documents.filter((document) => document.type === DocumentType.Waybill || document.type === DocumentType.Invoice);
  const transferDocuments = purchase.documents.filter((document) => document.type === DocumentType.TransferAct);

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
            <CardTitle>{t('purchases.editPurchase', 'Редагувати закупівлю')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="title">{t('purchases.titleFields', 'Назва (опис)')}</Label>
                <Input id="title" {...register('title', { required: true })} placeholder={t('purchases.titlePlaceholder', 'Напр. 5 Мавіків')} data-testid="purchase-detail-title-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmountStr">{t('purchases.amountFields', 'Загальна сума (₴)')}</Label>
                <Input id="totalAmountStr" type="number" step="0.01" {...register('totalAmountStr', { required: true })} data-testid="purchase-detail-total-amount-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('purchases.statusFields', 'Статус')}</Label>
                <Select onValueChange={(val) => setValue('status', val)} defaultValue={String(purchase.status)}>
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
            </form>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-4">
            <Button type="button" variant="default" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePurchase} disabled={deletePurchase.isPending} data-testid="purchase-detail-delete-button">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
            <Button type="submit" form="purchase-form" disabled={isSubmitting} data-testid="purchase-detail-save-button">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </CardFooter>
        </Card>

        {/* Documents Panel */}
        <div className="space-y-6">
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
                    event.preventDefault();
                    setActiveUploadHoverZone('receipts');
                  }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setReceiptUploadFile)}
                  data-testid="purchase-documents-receipts-dropzone"
                >
                  <p className="mb-2 text-xs text-muted-foreground">{t('purchases.uploadDropHint', 'Перетягніть файл сюди або оберіть вручну')}</p>
                  <Input type="file" onChange={(event) => setReceiptUploadFile(event.target.files?.[0] ?? null)} data-testid="purchase-documents-receipts-file-input" />
                  {receiptUploadFile ? <p className="mt-2 truncate text-xs text-foreground">{receiptUploadFile.name}</p> : null}
                </div>

                <Button
                  type="button"
                  onClick={() => handleUpload(receiptUploadFile, DocumentType.BankReceipt, () => setReceiptUploadFile(null))}
                  disabled={!receiptUploadFile || uploadDocument.isPending}
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
                          <Button type="button" variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false)} disabled={processDocumentOcr.isPending} data-testid={`purchase-document-ocr-button-${doc.id}`}>
                            <Sparkles className="h-4 w-4" />
                            {t('purchases.blocks.runOcr', 'Запустити OCR')}
                          </Button>
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

              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-waybills-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.waybillsTitle', 'Блок накладних')}</p>
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.waybillsDescription', 'Видаткові накладні та рахунки з OCR.')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t('purchases.docType', 'Тип документу')}</Label>
                  <Select value={String(waybillUploadType)} onValueChange={(value) => setWaybillUploadType(Number(value) as DocumentTypeType)}>
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
                    event.preventDefault();
                    setActiveUploadHoverZone('waybills');
                  }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setWaybillUploadFile)}
                  data-testid="purchase-documents-waybills-dropzone"
                >
                  <p className="mb-2 text-xs text-muted-foreground">{t('purchases.uploadDropHint', 'Перетягніть файл сюди або оберіть вручну')}</p>
                  <Input type="file" onChange={(event) => setWaybillUploadFile(event.target.files?.[0] ?? null)} data-testid="purchase-documents-waybills-file-input" />
                  {waybillUploadFile ? <p className="mt-2 truncate text-xs text-foreground">{waybillUploadFile.name}</p> : null}
                </div>

                <Button
                  type="button"
                  onClick={() => handleUpload(waybillUploadFile, waybillUploadType, () => setWaybillUploadFile(null))}
                  disabled={!waybillUploadFile || uploadDocument.isPending}
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
                          <Button type="button" variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false)} disabled={processDocumentOcr.isPending} data-testid={`purchase-document-ocr-button-${doc.id}`}>
                            <Sparkles className="h-4 w-4" />
                            {t('purchases.blocks.runOcr', 'Запустити OCR')}
                          </Button>
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

              <section className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3" data-testid="purchase-documents-transfer-block">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{t('purchases.blocks.transferTitle', 'Блок передачі (optional)')}</p>
                  <p className="text-xs text-muted-foreground">{t('purchases.blocks.transferDescription', 'Акти прийому-передачі. OCR обмежено з міркувань безпеки.')}</p>
                </div>

                <div
                  className={`rounded-xl border border-dashed px-3 py-2 transition-colors ${activeUploadHoverZone === 'transfer' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/60'}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setActiveUploadHoverZone('transfer');
                  }}
                  onDragLeave={() => setActiveUploadHoverZone(null)}
                  onDrop={(event) => handleUploadDrop(event, setTransferUploadFile)}
                  data-testid="purchase-documents-transfer-dropzone"
                >
                  <p className="mb-2 text-xs text-muted-foreground">{t('purchases.uploadDropHint', 'Перетягніть файл сюди або оберіть вручну')}</p>
                  <Input type="file" onChange={(event) => setTransferUploadFile(event.target.files?.[0] ?? null)} data-testid="purchase-documents-transfer-file-input" />
                  {transferUploadFile ? <p className="mt-2 truncate text-xs text-foreground">{transferUploadFile.name}</p> : null}
                </div>

                <Button
                  type="button"
                  onClick={() => handleUpload(transferUploadFile, DocumentType.TransferAct, () => setTransferUploadFile(null))}
                  disabled={!transferUploadFile || uploadDocument.isPending}
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

              {!purchase.documents.length ? (
                <p className="border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">{t('purchases.noDocuments', 'Документів ще немає')}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
