import { useState } from 'react';
import { useParams, useNavigate, useNavigation, useSubmit, redirect } from 'react-router-dom';
import type { ActionFunctionArgs as ClientActionArgs } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Trash2,
  UploadCloud,
  Loader2,
  Eye,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  usePurchaseDetailShort,
  useUpdatePurchaseShort,
  useDeletePurchaseShort,
  useUploadPurchaseDocumentShort,
  useUpdatePurchaseDocumentMetadataShort,
  useDeletePurchaseDocumentShort,
  useProcessPurchaseDocumentOcrShort,
  useAddWaybillItem,
  useUpdateWaybillItem,
  useDeleteWaybillItem,
  useAttachPurchaseToCampaign,
  purchaseKeys,
} from '@/hooks/queries/usePurchases';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import {
  PurchaseStatus,
  DocumentType,
  OcrProcessingStatus,
  type UpdatePurchaseRequest,
  type UpdateDocumentMetadataRequest,
} from '@/types';
import { getPurchaseStatusLabel, getDocumentTypeLabel } from '@/utils/purchaseUtils';
import { DocumentPreviewDialog } from '@/components/ui/document-preview-dialog';
import { DocumentMetadataForm } from './components/DocumentMetadataForm';
import { purchaseService } from '@/services/purchaseService';
import { queryClient } from '@/services/queryClient';

export async function clientAction({ request, params }: ClientActionArgs) {
  const { orgId, campaignId } = params as { orgId: string; campaignId?: string };
  if (!orgId) throw new Error('Organization ID missing');

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createPurchase') {
    const title = String(formData.get('title'));
    
    let newPurchaseId: string;
    if (campaignId) {
      const purchase = await purchaseService.create(orgId, campaignId, { title, totalAmount: 0 });
      newPurchaseId = purchase.id;
      queryClient.invalidateQueries({ queryKey: purchaseKeys.list(orgId, campaignId) });
    } else {
      const purchase = await purchaseService.createDraft({ title, organizationId: orgId });
      newPurchaseId = purchase.id;
      queryClient.invalidateQueries({ queryKey: purchaseKeys.organizationList(orgId) });
    }
    
    return redirect(campaignId 
      ? `/dashboard/${orgId}/campaigns/${campaignId}/purchases/${newPurchaseId}`
      : `/dashboard/${orgId}/purchases/${newPurchaseId}`);
  }
  
  return null;
}

export default function PurchaseDetailPage() {
  const { orgId, purchaseId, campaignId: routeCampaignId } = useParams<{
    orgId: string;
    purchaseId: string;
    campaignId?: string;
  }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isNew = purchaseId === 'new' || !purchaseId;

  const {
    data: purchase,
    isLoading: isPurchaseLoading,
  } = usePurchaseDetailShort(
    orgId!, 
    purchaseId!, 
    !isNew, 
    (data: any) => {
      const documents = data?.documents;
      if (!Array.isArray(documents)) return false;
      return documents.some((doc: any) => 
        doc.ocrProcessingStatus === OcrProcessingStatus.Processing ||
        doc.ocrProcessingStatus === OcrProcessingStatus.NotProcessed
      ) ? 3000 : false;
    }
  );

  const { data: campaigns = [] } = useCampaigns(orgId!, undefined, { enabled: !isNew && !purchase?.campaignId });
  const selectableCampaigns = campaigns;

  const updatePurchaseMutation = useUpdatePurchaseShort();
  const deletePurchaseMutation = useDeletePurchaseShort();
  const uploadDocumentMutation = useUploadPurchaseDocumentShort();
  const updateMetadataMutation = useUpdatePurchaseDocumentMetadataShort();
  const deleteDocumentMutation = useDeletePurchaseDocumentShort();
  const processOcrMutation = useProcessPurchaseDocumentOcrShort();
  const attachPurchaseMutation = useAttachPurchaseToCampaign();

  const addWaybillItemMutation = useAddWaybillItem();
  const updateWaybillItemMutation = useUpdateWaybillItem();
  const deleteWaybillItemMutation = useDeleteWaybillItem();

  const [receiptUploadFile, setReceiptUploadFile] = useState<File | null>(null);
  const [waybillUploadFile, setWaybillUploadFile] = useState<File | null>(null);
  const [transferUploadFile, setTransferUploadFile] = useState<File | null>(null);
  const [waybillUploadType, setWaybillUploadType] = useState<DocumentType>(DocumentType.Waybill);
  const [previewDocument, setPreviewDocument] = useState<{ src: string; title: string } | null>(null);
  const [activeUploadHoverZone, setActiveUploadHoverZone] = useState<'receipts' | 'waybills' | 'transfer' | null>(null);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [selectedAttachCampaignId, setSelectedAttachCampaignId] = useState<string>('');

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<UpdatePurchaseRequest>({
    values: {
      title: purchase?.title ?? '',
      status: purchase?.status ?? PurchaseStatus.PaymentSent,
    },
  });

  const isDocumentsLocked = isNew;


  const onSave = async (data: UpdatePurchaseRequest) => {
    if (isNew) {
      const formData = new FormData();
      formData.append('intent', 'createPurchase');
      formData.append('title', data.title ?? '');
      formData.append('status', String(data.status ?? PurchaseStatus.PaymentSent));
      submit(formData, { method: 'post' });
    } else {
      await updatePurchaseMutation.mutateAsync({
        organizationId: orgId!,
        purchaseId: purchaseId!,
        payload: data,
      });
      toast.success(t('common.savedSuccessfully', 'Збережено успішно'));
    }
  };

  const onDelete = async () => {
    if (!window.confirm(t('common.confirmDelete', 'Ви впевнені?'))) return;
    await deletePurchaseMutation.mutateAsync({
      organizationId: orgId!,
      purchaseId: purchaseId!,
    });
    toast.success(t('common.deletedSuccessfully', 'Видалено успішно'));
    navigate(routeCampaignId ? `/dashboard/${orgId}/campaigns/${routeCampaignId}/purchases` : `/dashboard/${orgId}/purchases`);
  };

  const handleUpload = async (file: File | null, type: DocumentType, clearFile: () => void) => {
    if (!file) return;
    await uploadDocumentMutation.mutateAsync({
      organizationId: orgId!,
      purchaseId: purchaseId!,
      file,
      type,
    });
    toast.success(t('purchases.uploadSuccess', 'Файл завантажено'));
    clearFile();
  };

  const handleUploadDrop = (event: React.DragEvent, setFile: (file: File | null) => void) => {
    event.preventDefault();
    setActiveUploadHoverZone(null);
    const file = event.dataTransfer.files[0];
    if (file) setFile(file);
  };

  const handleSaveDocumentMetadata = async (documentId: string, payload: UpdateDocumentMetadataRequest) => {
    console.log(`[PurchaseDetail] Saving metadata for document ${documentId}...`, payload);
    updateMetadataMutation.mutate(
      {
        organizationId: orgId!,
        purchaseId: purchaseId!,
        documentId,
        payload,
      },
      {
        onSuccess: () => {
          console.log(`[PurchaseDetail] Metadata saved for document ${documentId}`);
          toast.success(t('purchases.documentMetadataSaved', 'Метадані документа оновлено'));
        },
        onError: (error) => {
          console.error(`[PurchaseDetail] Failed to save metadata for document ${documentId}:`, error);
        }
      }
    );
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm(t('common.confirmDelete', 'Ви впевнені?'))) return;
    await deleteDocumentMutation.mutateAsync({
      organizationId: orgId!,
      purchaseId: purchaseId!,
      documentId,
    });
    toast.success(t('common.deletedSuccessfully', 'Видалено'));
  };

  const handleRunDocumentOcr = async (documentId: string, confirmReprocess: boolean, status: OcrProcessingStatus) => {
    if (status === OcrProcessingStatus.Success && !confirmReprocess) {
      if (!window.confirm(t('purchases.confirmOcrReprocess', 'Цей документ вже розпізнано. Бажаєте повторити?'))) return;
    }
    await processOcrMutation.mutateAsync({
      organizationId: orgId!,
      purchaseId: purchaseId!,
      documentId,
      confirmReprocess: true,
    });
    toast.success(t('purchases.ocrSuccess', 'Документ розпізнано'));
  };

  const openDocumentPreview = (src: string, title: string) => {
    setPreviewDocument({ src, title });
  };

  const handleAttachPurchase = async () => {
    if (!selectedAttachCampaignId) return;
    await attachPurchaseMutation.mutateAsync({
      purchaseId: purchaseId!,
      payload: { campaignId: selectedAttachCampaignId },
    });
    toast.success(t('purchases.attachedSuccessfully', 'Закупівлю прикріплено до збору'));
    setIsAttachDialogOpen(false);
  };

  const handleAddWaybillItem = async (documentId: string) => {
    await addWaybillItemMutation.mutateAsync({
      documentId,
      payload: { name: t('purchases.newItem', 'Нова позиція'), quantity: 1, unitPrice: 0 },
    });
  };

  const handleUpdateWaybillItem = async (documentId: string, itemId: string, name: string, quantity: number, unitPrice: number) => {
    await updateWaybillItemMutation.mutateAsync({
      documentId,
      itemId,
      payload: { name, quantity, unitPrice },
    });
  };

  const handleDeleteWaybillItem = async (documentId: string, itemId: string) => {
    if (!window.confirm(t('common.confirmDelete', 'Ви впевнені?'))) return;
    await deleteWaybillItemMutation.mutateAsync({ documentId, itemId });
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
        <Button variant="ghost" size="sm" onClick={() => navigate(routeCampaignId ? `/dashboard/${orgId}/campaigns/${routeCampaignId}/purchases` : `/dashboard/${orgId}/purchases`)} className="-ml-3">
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

  const isSaving = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'createPurchase';
  const isPending = navigation.state === 'submitting' || isSubmitting;

  const purchaseDocuments = purchase?.documents ?? [];
  const receiptDocuments = purchaseDocuments.filter((document) => document.type === DocumentType.BankReceipt);
  const waybillDocuments = purchaseDocuments.filter((document) => document.type === DocumentType.Waybill || document.type === DocumentType.Invoice);
  const transferDocuments = purchaseDocuments.filter((document) => document.type === DocumentType.TransferAct);

  const backPath = routeCampaignId 
    ? `/dashboard/${orgId}/campaigns/${routeCampaignId}/purchases` 
    : (purchase?.campaignId 
        ? `/dashboard/${orgId}/campaigns/${purchase.campaignId}/purchases`
        : `/dashboard/${orgId}/purchases`);

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="purchase-detail-page">
      <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="-ml-3" data-testid="purchase-detail-back-button">
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
                <Select onValueChange={(val) => setValue('status', Number(val) as PurchaseStatus)} defaultValue={String(purchase?.status ?? PurchaseStatus.PaymentSent)}>
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
              {(isSaving || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  <Input data-testid="purchase-document-receipt-input" type="file" disabled={isDocumentsLocked} onChange={(event) => setReceiptUploadFile(event.target.files?.[0] ?? null)} />
                  {receiptUploadFile && <p className="mt-2 text-xs">{receiptUploadFile.name}</p>}
                </div>
                <Button data-testid="purchase-document-receipt-upload-button" onClick={() => handleUpload(receiptUploadFile, DocumentType.BankReceipt, () => setReceiptUploadFile(null))} disabled={isDocumentsLocked || !receiptUploadFile || uploadDocumentMutation.isPending}>
                  {uploadDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {t('purchases.upload')}
                </Button>
                {receiptDocuments.map((doc: any) => (
                  <div key={doc.id} className="p-3 border rounded-lg bg-background/50" data-testid={`document-row-${doc.id}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium truncate">{doc.originalFileName}</span>
                      <div className="flex gap-1">
                        <Button data-testid={`purchase-document-ocr-button-${doc.id}`} variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false, doc.ocrProcessingStatus)} disabled={processOcrMutation.isPending || doc.ocrProcessingStatus === OcrProcessingStatus.Processing}>
                          {processOcrMutation.isPending || doc.ocrProcessingStatus === OcrProcessingStatus.Processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc.fileUrl ?? '', doc.originalFileName)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDocument(doc.id)} disabled={deleteDocumentMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DocumentMetadataForm 
                      key={`${doc.id}-${doc.ocrProcessingStatus}`}
                      document={doc} 
                      onSubmit={handleSaveDocumentMetadata} 
                      isPending={updateMetadataMutation.isPending} 
                      t={t} 
                    />
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
                  <Input data-testid="purchase-document-waybill-input" type="file" disabled={isDocumentsLocked} onChange={(event) => setWaybillUploadFile(event.target.files?.[0] ?? null)} />
                  {waybillUploadFile && <p className="mt-2 text-xs">{waybillUploadFile.name}</p>}
                </div>
                <Button data-testid="purchase-document-waybill-upload-button" onClick={() => handleUpload(waybillUploadFile, waybillUploadType, () => setWaybillUploadFile(null))} disabled={isDocumentsLocked || !waybillUploadFile || uploadDocumentMutation.isPending}>
                  {uploadDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {t('purchases.upload')}
                </Button>
                {waybillDocuments.map((doc: any) => {
                  console.log(`[PurchaseDetail] Rendering waybill doc ${doc.id}:`, doc);
                  return (
                    <div key={doc.id} className="p-3 border rounded-lg bg-background/50" data-testid={`document-row-${doc.id}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium truncate">{doc.originalFileName}</span>
                        <div className="flex gap-1">
                          <Button data-testid={`purchase-document-ocr-button-${doc.id}`} variant="outline" size="sm" onClick={() => handleRunDocumentOcr(doc.id, false, doc.ocrProcessingStatus)} disabled={processOcrMutation.isPending || doc.ocrProcessingStatus === OcrProcessingStatus.Processing}>
                            {processOcrMutation.isPending || doc.ocrProcessingStatus === OcrProcessingStatus.Processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc.fileUrl ?? '', doc.originalFileName)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDocument(doc.id)} disabled={deleteDocumentMutation.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <DocumentMetadataForm
                        key={`${doc.id}-${doc.ocrProcessingStatus}`}
                        document={doc}
                        onSubmit={handleSaveDocumentMetadata}
                        onAddWaybillItem={handleAddWaybillItem}
                        onUpdateWaybillItem={handleUpdateWaybillItem}
                        onDeleteWaybillItem={handleDeleteWaybillItem}
                        isPending={updateMetadataMutation.isPending || addWaybillItemMutation.isPending || updateWaybillItemMutation.isPending || deleteWaybillItemMutation.isPending}
                        t={t}
                      />
                    </div>
                  );
                })}
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
                <Button onClick={() => handleUpload(transferUploadFile, DocumentType.TransferAct, () => setTransferUploadFile(null))} disabled={isDocumentsLocked || !transferUploadFile || uploadDocumentMutation.isPending}>
                  {uploadDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {t('purchases.upload')}
                </Button>
                {transferDocuments.map((doc: any) => (
                  <div key={doc.id} className="p-3 border rounded-lg bg-background/50" data-testid={`document-row-${doc.id}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium truncate">{doc.originalFileName}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc.fileUrl ?? '', doc.originalFileName)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDocument(doc.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DocumentMetadataForm 
                      key={`${doc.id}-${doc.ocrProcessingStatus}`}
                      document={doc} 
                      onSubmit={handleSaveDocumentMetadata} 
                      isPending={updateMetadataMutation.isPending} 
                      t={t} 
                    />
                  </div>
                ))}
              </section>
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentPreviewDialog
        open={Boolean(previewDocument)}
        onOpenChange={(open: boolean) => { if (!open) setPreviewDocument(null); }}
        src={previewDocument?.src ?? null}
        title={previewDocument?.title ?? ''}
        testIdPrefix="purchase-detail-doc-preview"
      />

      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('purchases.attachToCampaign', 'Прикріпити до збору')}</DialogTitle></DialogHeader>
          <Select value={selectedAttachCampaignId} onValueChange={setSelectedAttachCampaignId}>
            <SelectTrigger data-testid="purchase-attach-campaign-select">
              <SelectValue placeholder={t('purchases.filters.selectCampaign', 'Оберіть збір')} />
            </SelectTrigger>
            <SelectContent>
              {selectableCampaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.titleUk}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button data-testid="purchase-attach-save-button" onClick={handleAttachPurchase} disabled={isPending}>{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
