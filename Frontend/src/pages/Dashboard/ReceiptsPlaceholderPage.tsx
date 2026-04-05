import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Crop,
  FileDigit,
  FileImage,
  Loader2,
  PencilLine,
  Receipt,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useActivateReceipt,
  useExtractReceiptData,
  useGetMyReceipt,
  useRetryReceiptProcessing,
  useUpdateReceiptOcrDraft,
  useUploadReceiptDraft,
  useVerifyReceipt,
} from '@/hooks/queries/useReceipts';
import { cn } from '@/lib/utils';
import {
  ReceiptPublicationStatus,
  type ReceiptPipeline,
  ReceiptStatus,
} from '@/types';

const statusLabelMap: Record<number, string> = {
  [ReceiptStatus.PendingOcr]: 'Pending OCR',
  [ReceiptStatus.PendingStateValidation]: 'Pending state validation',
  [ReceiptStatus.OcrExtracted]: 'OCR extracted',
  [ReceiptStatus.FailedVerification]: 'Failed verification',
  [ReceiptStatus.ValidationDeferredRateLimit]: 'Deferred (rate limit)',
  [ReceiptStatus.Draft]: 'Draft',
  [ReceiptStatus.StateVerified]: 'State verified',
  [ReceiptStatus.InvalidData]: 'Invalid data',
  [ReceiptStatus.OcrDeferredMonthlyQuota]: 'Deferred (monthly quota)',
};

const publicationLabelMap: Record<number, string> = {
  [ReceiptPublicationStatus.Draft]: 'Draft',
  [ReceiptPublicationStatus.Active]: 'Active',
};

const emptyOcrDraft = {
  merchantName: '',
  totalAmount: '',
  purchaseDateUtc: '',
  fiscalNumber: '',
  receiptCode: '',
  currency: '',
  purchasedItemName: '',
};

const ocrFieldLabels: Record<keyof typeof emptyOcrDraft, string> = {
  merchantName: 'Магазин',
  totalAmount: 'Сума',
  purchaseDateUtc: 'Дата покупки',
  fiscalNumber: 'Fiscal number',
  receiptCode: 'Receipt code',
  currency: 'Валюта',
  purchasedItemName: 'Назва товару',
};

type OcrDraft = typeof emptyOcrDraft;

interface ItemPhotoAsset {
  id: string;
  file: File;
  previewUrl: string;
  cropped: boolean;
}

interface CropSession {
  kind: 'receipt' | 'item';
  src: string;
  file: File;
  itemId?: string;
  fallbackToOriginal: boolean;
}

function formatAmount(value?: number) {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('uk-UA');
}

function formatDateTimeLocalValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseAmount(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStructuredJson(value: string) {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('JSON має бути обʼєктом.');
  }
  return parsed as Record<string, unknown>;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function getAmountString(value: unknown) {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  return '';
}

function buildJsonFromDraft(draft: OcrDraft) {
  return JSON.stringify({
    merchantName: normalizeText(draft.merchantName) ?? null,
    totalAmount: parseAmount(draft.totalAmount),
    purchaseDateUtc: draft.purchaseDateUtc ? new Date(draft.purchaseDateUtc).toISOString() : null,
    fiscalNumber: normalizeText(draft.fiscalNumber) ?? null,
    receiptCode: normalizeText(draft.receiptCode) ?? null,
    currency: normalizeText(draft.currency) ?? null,
    purchasedItemName: normalizeText(draft.purchasedItemName) ?? null,
  }, null, 2);
}

function buildOcrDraft(receipt: ReceiptPipeline | null): OcrDraft {
  if (!receipt) return emptyOcrDraft;

  let structuredPayload: Record<string, unknown> = {};
  if (receipt.ocrStructuredPayloadJson) {
    try {
      structuredPayload = parseStructuredJson(receipt.ocrStructuredPayloadJson);
    } catch {
      structuredPayload = {};
    }
  }

  return {
    merchantName: getStringValue(structuredPayload.merchantName) ?? receipt.merchantName ?? '',
    totalAmount: getAmountString(structuredPayload.totalAmount) || (typeof receipt.totalAmount === 'number' ? receipt.totalAmount.toString() : ''),
    purchaseDateUtc: formatDateTimeLocalValue(getStringValue(structuredPayload.purchaseDateUtc) ?? receipt.purchaseDateUtc),
    fiscalNumber: getStringValue(structuredPayload.fiscalNumber) ?? receipt.fiscalNumber ?? '',
    receiptCode: getStringValue(structuredPayload.receiptCode) ?? receipt.receiptCode ?? '',
    currency: getStringValue(structuredPayload.currency) ?? receipt.currency ?? '',
    purchasedItemName: getStringValue(structuredPayload.purchasedItemName) ?? receipt.purchasedItemName ?? '',
  };
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  return `${baseName}.${extension}`;
}

function createItemPhotoAsset(file: File, cropped: boolean, id: string = crypto.randomUUID()): ItemPhotoAsset {
  return { id, file, previewUrl: URL.createObjectURL(file), cropped };
}

export default function ReceiptsPlaceholderPage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const [uploadTab, setUploadTab] = useState<'receipt' | 'items'>('receipt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [selectedFileWasCropped, setSelectedFileWasCropped] = useState(false);
  const [itemPhotos, setItemPhotos] = useState<ItemPhotoAsset[]>([]);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [receiptIdInput, setReceiptIdInput] = useState('');
  const [receipt, setReceipt] = useState<ReceiptPipeline | null>(null);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft>(emptyOcrDraft);
  const [ocrJsonInput, setOcrJsonInput] = useState(buildJsonFromDraft(emptyOcrDraft));
  const [ocrJsonError, setOcrJsonError] = useState<string | null>(null);
  const [hasOcrChanges, setHasOcrChanges] = useState(false);
  const selectedFilePreviewRef = useRef<string | null>(null);
  const itemPhotosRef = useRef<ItemPhotoAsset[]>([]);
  const cropSessionRef = useRef<CropSession | null>(null);

  const uploadDraftMutation = useUploadReceiptDraft();
  const extractMutation = useExtractReceiptData();
  const updateOcrDraftMutation = useUpdateReceiptOcrDraft();
  const verifyMutation = useVerifyReceipt();
  const activateMutation = useActivateReceipt();
  const retryMutation = useRetryReceiptProcessing();
  const getReceiptMutation = useGetMyReceipt();

  const activeReceiptId = useMemo(
    () => receipt?.id ?? receiptIdInput.trim(),
    [receipt?.id, receiptIdInput],
  );

  const isBusy = uploadDraftMutation.isPending
    || extractMutation.isPending
    || updateOcrDraftMutation.isPending
    || verifyMutation.isPending
    || activateMutation.isPending
    || retryMutation.isPending
    || getReceiptMutation.isPending;

  const missingOcrFields = useMemo(() => {
    const missing = Object.entries(ocrDraft)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => ocrFieldLabels[key as keyof OcrDraft]);

    if (!ocrDraft.fiscalNumber.trim() && !ocrDraft.receiptCode.trim()) {
      return missing.filter((label) => label !== 'Fiscal number' && label !== 'Receipt code')
        .concat('Fiscal number або Receipt code');
    }

    return missing;
  }, [ocrDraft]);

  useEffect(() => {
    selectedFilePreviewRef.current = selectedFilePreview;
  }, [selectedFilePreview]);

  useEffect(() => {
    itemPhotosRef.current = itemPhotos;
  }, [itemPhotos]);

  useEffect(() => {
    cropSessionRef.current = cropSession;
  }, [cropSession]);

  useEffect(() => () => {
    if (selectedFilePreviewRef.current) URL.revokeObjectURL(selectedFilePreviewRef.current);
    itemPhotosRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    if (cropSessionRef.current?.src) URL.revokeObjectURL(cropSessionRef.current.src);
  }, []);

  const hydrateOcrState = (nextReceipt: ReceiptPipeline | null) => {
    const nextDraft = buildOcrDraft(nextReceipt);
    setOcrDraft(nextDraft);
    setOcrJsonInput(nextReceipt?.ocrStructuredPayloadJson?.trim() || buildJsonFromDraft(nextDraft));
    setOcrJsonError(null);
    setHasOcrChanges(false);
  };

  const applyReceipt = (next: ReceiptPipeline) => {
    setReceipt(next);
    setReceiptIdInput(next.id);
    hydrateOcrState(next);
  };

  const replaceSelectedFilePreview = (nextPreview: string | null) => {
    setSelectedFilePreview((current) => {
      if (current && current !== nextPreview) URL.revokeObjectURL(current);
      return nextPreview;
    });
  };

  const applyReceiptFile = (file: File, previewUrl: string | null, cropped: boolean) => {
    setSelectedFile(file);
    replaceSelectedFilePreview(previewUrl);
    setSelectedFileWasCropped(cropped);
  };

  const onReceiptFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isImageFile(file)) {
      setCropSession({
        kind: 'receipt',
        src: URL.createObjectURL(file),
        file,
        fallbackToOriginal: true,
      });
    } else {
      applyReceiptFile(file, null, false);
    }

    event.target.value = '';
  };

  const onItemPhotosSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length !== files.length) {
      toast.error('Для фото товарів доступні лише зображення');
    }
    if (imageFiles.length > 0) {
      const nextAssets = imageFiles.map((file) => createItemPhotoAsset(file, false));
      setItemPhotos((prev) => [...prev, ...nextAssets]);
      const [firstAsset] = nextAssets;
      if (firstAsset) {
        setCropSession({
          kind: 'item',
          src: URL.createObjectURL(firstAsset.file),
          file: firstAsset.file,
          itemId: firstAsset.id,
          fallbackToOriginal: false,
        });
      }
    }
    event.target.value = '';
  };

  const onRemoveItemPhoto = (itemId: string) => {
    setItemPhotos((prev) => prev.filter((item) => {
      if (item.id === itemId) {
        URL.revokeObjectURL(item.previewUrl);
        return false;
      }
      return true;
    }));
  };

  const onMoveItemPhoto = (index: number, direction: -1 | 1) => {
    setItemPhotos((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const onRecropReceipt = () => {
    if (!selectedFile || !isImageFile(selectedFile)) return;
    setCropSession({
      kind: 'receipt',
      src: URL.createObjectURL(selectedFile),
      file: selectedFile,
      fallbackToOriginal: false,
    });
  };

  const onRecropItemPhoto = (item: ItemPhotoAsset) => {
    setCropSession({
      kind: 'item',
      src: URL.createObjectURL(item.file),
      file: item.file,
      itemId: item.id,
      fallbackToOriginal: false,
    });
  };

  const closeCropSession = (useOriginalOnCancel: boolean) => {
    if (!cropSession) return;
    if (useOriginalOnCancel) {
      if (cropSession.kind === 'receipt') {
        applyReceiptFile(
          cropSession.file,
          URL.createObjectURL(cropSession.file),
          false,
        );
      } else {
        setItemPhotos((prev) => [...prev, createItemPhotoAsset(cropSession.file, false)]);
      }
    }
    URL.revokeObjectURL(cropSession.src);
    setCropSession(null);
  };

  const onCropComplete = (blob: Blob) => {
    if (!cropSession) return;

    const croppedFile = new File(
      [blob],
      replaceExtension(cropSession.file.name, 'webp'),
      { type: 'image/webp' },
    );

    if (cropSession.kind === 'receipt') {
      applyReceiptFile(croppedFile, URL.createObjectURL(croppedFile), true);
    } else if (cropSession.itemId) {
      setItemPhotos((prev) => prev.map((item) => {
        if (item.id !== cropSession.itemId) return item;
        URL.revokeObjectURL(item.previewUrl);
        return createItemPhotoAsset(croppedFile, true, cropSession.itemId);
      }));
    }

    URL.revokeObjectURL(cropSession.src);
    setCropSession(null);
  };

  const onChangeOcrField = (field: keyof OcrDraft, value: string) => {
    const nextDraft = { ...ocrDraft, [field]: value };
    setOcrDraft(nextDraft);
    setOcrJsonInput(buildJsonFromDraft(nextDraft));
    setOcrJsonError(null);
    setHasOcrChanges(true);
  };

  const onApplyJsonDraft = () => {
    try {
      const parsed = parseStructuredJson(ocrJsonInput);
      const nextDraft: OcrDraft = {
        merchantName: getStringValue(parsed.merchantName) ?? '',
        totalAmount: getAmountString(parsed.totalAmount),
        purchaseDateUtc: formatDateTimeLocalValue(getStringValue(parsed.purchaseDateUtc)),
        fiscalNumber: getStringValue(parsed.fiscalNumber) ?? '',
        receiptCode: getStringValue(parsed.receiptCode) ?? '',
        currency: getStringValue(parsed.currency) ?? '',
        purchasedItemName: getStringValue(parsed.purchasedItemName) ?? '',
      };
      setOcrDraft(nextDraft);
      setOcrJsonInput(JSON.stringify(parsed, null, 2));
      setOcrJsonError(null);
      setHasOcrChanges(true);
      toast.success('JSON застосовано до форми');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося прочитати JSON';
      setOcrJsonError(message);
      toast.error(message);
    }
  };

  const onResetOcrDraft = () => {
    hydrateOcrState(receipt);
    toast.success('OCR draft синхронізовано з поточним станом чека');
  };

  const onUploadDraft = async () => {
    if (!selectedFile) {
      toast.error('Оберіть файл чека для завантаження');
      return;
    }

    try {
      const result = await uploadDraftMutation.mutateAsync(selectedFile);
      applyReceipt(result);
      toast.success('Чернетку чека завантажено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onExtract = async () => {
    if (!orgId) {
      toast.error('Не визначено організацію в URL');
      return;
    }

    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    if (!selectedFile) {
      toast.error('Оберіть той самий файл для OCR етапу');
      return;
    }

    try {
      const result = await extractMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
        file: selectedFile,
      });
      applyReceipt(result);
      toast.success('OCR етап виконано');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onSaveOcrDraft = async () => {
    if (!activeReceiptId) {
      toast.error('Спершу завантажте або виберіть чек');
      return;
    }

    let normalizedJson = buildJsonFromDraft(ocrDraft);

    try {
      const parsed = parseStructuredJson(ocrJsonInput);
      normalizedJson = JSON.stringify(parsed, null, 2);
      setOcrJsonInput(normalizedJson);
      setOcrJsonError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося зберегти OCR JSON';
      setOcrJsonError(message);
      toast.error(message);
      return;
    }

    try {
      const result = await updateOcrDraftMutation.mutateAsync({
        receiptId: activeReceiptId,
        payload: {
          merchantName: normalizeText(ocrDraft.merchantName),
          totalAmount: parseAmount(ocrDraft.totalAmount),
          purchaseDateUtc: ocrDraft.purchaseDateUtc ? new Date(ocrDraft.purchaseDateUtc).toISOString() : null,
          fiscalNumber: normalizeText(ocrDraft.fiscalNumber),
          receiptCode: normalizeText(ocrDraft.receiptCode),
          currency: normalizeText(ocrDraft.currency),
          purchasedItemName: normalizeText(ocrDraft.purchasedItemName),
          ocrStructuredPayloadJson: normalizedJson,
        },
      });
      applyReceipt(result);
      toast.success('OCR чернетку збережено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onVerify = async () => {
    if (!orgId) {
      toast.error('Не визначено організацію в URL');
      return;
    }

    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await verifyMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
      });
      applyReceipt(result);
      toast.success('Державна верифікація завершена');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onActivate = async () => {
    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await activateMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success('Чек опубліковано');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRetry = async () => {
    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await retryMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success('Запущено повторну обробку');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRefresh = async () => {
    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await getReceiptMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success('Стан чека оновлено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-6" data-testid="dashboard-receipts-page">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="dashboard-receipts-title">
          <Receipt className="h-6 w-6 text-primary" />
          {t('receipts.title')}
        </h2>
        <p className="text-muted-foreground" data-testid="dashboard-receipts-subtitle">{t('receipts.subtitle')}</p>
      </div>

      {!orgId ? (
        <Alert variant="destructive" data-testid="dashboard-receipts-no-org-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Некоректний маршрут</AlertTitle>
          <AlertDescription>Сторінка чеків потребує orgId в URL.</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-upload-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileDigit className="h-5 w-5 text-primary" />
            Завантаження чека
          </CardTitle>
          <CardDescription>Перший інкремент для flow Receipt/Purchased items.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={uploadTab} onValueChange={(value) => setUploadTab(value as 'receipt' | 'items')} data-testid="dashboard-receipts-upload-tabs">
            <TabsList className="grid w-full grid-cols-2" data-testid="dashboard-receipts-upload-tabs-list">
              <TabsTrigger value="receipt" data-testid="dashboard-receipts-upload-tab-receipt">Receipt</TabsTrigger>
              <TabsTrigger value="items" data-testid="dashboard-receipts-upload-tab-items">Purchased items</TabsTrigger>
            </TabsList>

            <TabsContent value="receipt" className="space-y-3" data-testid="dashboard-receipts-upload-tab-content-receipt">
              <div className="space-y-2">
                <Label htmlFor="receipt-file">Файл чека</Label>
                <Input
                  id="receipt-file"
                  type="file"
                  accept="image/*,application/pdf"
                  data-testid="dashboard-receipts-upload-file-input"
                  onChange={onReceiptFileSelected}
                />
              </div>
              {selectedFile ? (
                <div className="rounded-2xl border border-border/70 bg-muted/10 p-3">
                  {selectedFilePreview ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                        <img src={selectedFilePreview} alt="Попередній перегляд чека" className="max-h-80 w-full object-contain" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{selectedFile.name}</span>
                        <Badge variant="outline">{selectedFileWasCropped ? 'Обрізано' : 'Оригінал'}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm">
                      <FileImage className="h-5 w-5 text-primary" />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
              <Button
                onClick={onUploadDraft}
                disabled={!selectedFile || isBusy}
                data-testid="dashboard-receipts-upload-button"
              >
                {uploadDraftMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Завантажити чернетку
              </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedFilePreview || isBusy}
                  onClick={onRecropReceipt}
                >
                  <Crop className="h-4 w-4" />
                  Перекропити
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-3" data-testid="dashboard-receipts-upload-tab-content-items">
              <div className="space-y-2">
                <Label htmlFor="item-photos">Фото придбаних товарів</Label>
                <Input
                  id="item-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  data-testid="dashboard-receipts-items-files-input"
                  onChange={onItemPhotosSelected}
                />
              </div>

              {itemPhotos.length > 0 ? (
                <ul className="space-y-2" data-testid="dashboard-receipts-items-files-list">
                  {itemPhotos.map((photo, index) => (
                    <li key={photo.id} className="rounded-2xl border border-border/70 p-3" data-testid={`dashboard-receipts-items-file-${index}`}>
                      <div className="flex items-start gap-3">
                        <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border/60 bg-muted/10">
                          <img src={photo.previewUrl} alt={photo.file.name} className="h-full w-full object-cover" />
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold">#{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="truncate text-sm font-medium" title={photo.file.name}>{photo.file.name}</p>
                            <p className="text-xs text-muted-foreground">{photo.cropped ? 'Кроп застосовано' : 'Оригінальне фото'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => onMoveItemPhoto(index, -1)}>
                              <ArrowUp className="h-4 w-4" />
                              Вище
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={index === itemPhotos.length - 1} onClick={() => onMoveItemPhoto(index, 1)}>
                              <ArrowDown className="h-4 w-4" />
                              Нижче
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => onRecropItemPhoto(photo)}>
                              <Crop className="h-4 w-4" />
                              Кроп
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveItemPhoto(photo.id)} data-testid={`dashboard-receipts-items-remove-${index}`}>
                              <X className="h-4 w-4" />
                              Видалити
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="dashboard-receipts-items-empty">
                  Додайте фото товарів, за потреби обріжте їх і виставте коректний порядок.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-actions-card">
        <CardHeader>
          <CardTitle className="text-lg">Керування pipeline</CardTitle>
          <CardDescription>Extract, OCR review, verify, activate, retry та ручне оновлення статусу.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-id">ID чека</Label>
            <Input
              id="receipt-id"
              value={receiptIdInput}
              onChange={(event) => setReceiptIdInput(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              data-testid="dashboard-receipts-id-input"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Button
              onClick={onExtract}
              disabled={!orgId || !activeReceiptId || !selectedFile || isBusy}
              data-testid="dashboard-receipts-extract-button"
            >
              Extract
            </Button>
            <Button
              onClick={onVerify}
              disabled={!orgId || !activeReceiptId || isBusy}
              data-testid="dashboard-receipts-verify-button"
            >
              Verify
            </Button>
            <Button
              onClick={onActivate}
              disabled={!activeReceiptId || isBusy}
              data-testid="dashboard-receipts-activate-button"
            >
              Activate
            </Button>
            <Button
              variant="outline"
              onClick={onRetry}
              disabled={!activeReceiptId || isBusy}
              data-testid="dashboard-receipts-retry-button"
            >
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={!activeReceiptId || isBusy}
              data-testid="dashboard-receipts-refresh-button"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PencilLine className="h-5 w-5 text-primary" />
            OCR review та ручне виправлення
          </CardTitle>
          <CardDescription>Structured JSON і форма синхронізовані, тому користувач може швидко виправити порожні або неточні поля.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {receipt ? (
            <>
              {missingOcrFields.length > 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Перевірте ці поля</AlertTitle>
                  <AlertDescription>{missingOcrFields.join(', ')}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>OCR draft виглядає повним</AlertTitle>
                  <AlertDescription>Ключові поля заповнені, можна переходити до verify.</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="ocr-merchant">Магазин</Label>
                    <Input id="ocr-merchant" value={ocrDraft.merchantName} onChange={(event) => onChangeOcrField('merchantName', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr-total">Сума</Label>
                    <Input id="ocr-total" value={ocrDraft.totalAmount} onChange={(event) => onChangeOcrField('totalAmount', event.target.value)} placeholder="102.88" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr-currency">Валюта</Label>
                    <Input id="ocr-currency" value={ocrDraft.currency} onChange={(event) => onChangeOcrField('currency', event.target.value)} placeholder="UAH" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="ocr-purchase-date">Дата покупки</Label>
                    <Input id="ocr-purchase-date" type="datetime-local" value={ocrDraft.purchaseDateUtc} onChange={(event) => onChangeOcrField('purchaseDateUtc', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr-fiscal-number">Fiscal number</Label>
                    <Input id="ocr-fiscal-number" value={ocrDraft.fiscalNumber} onChange={(event) => onChangeOcrField('fiscalNumber', event.target.value)} placeholder="3001041447" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr-receipt-code">Receipt code</Label>
                    <Input id="ocr-receipt-code" value={ocrDraft.receiptCode} onChange={(event) => onChangeOcrField('receiptCode', event.target.value)} placeholder="10870061" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="ocr-item-name">Назва товару</Label>
                    <Input id="ocr-item-name" value={ocrDraft.purchasedItemName} onChange={(event) => onChangeOcrField('purchasedItemName', event.target.value)} placeholder="Напій Coca-Cola 0.75" />
                  </div>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <Button onClick={onSaveOcrDraft} disabled={!activeReceiptId || isBusy || !hasOcrChanges}>
                      {updateOcrDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Зберегти OCR правки
                    </Button>
                    <Button type="button" variant="outline" onClick={onResetOcrDraft} disabled={isBusy}>
                      Скинути до серверного стану
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="ocr-json">Structured OCR JSON</Label>
                      <Button type="button" size="sm" variant="outline" onClick={onApplyJsonDraft} disabled={isBusy}>
                        Застосувати JSON
                      </Button>
                    </div>
                    <Textarea
                      id="ocr-json"
                      value={ocrJsonInput}
                      onChange={(event) => {
                        setOcrJsonInput(event.target.value);
                        setOcrJsonError(null);
                        setHasOcrChanges(true);
                      }}
                      className={cn('min-h-72 font-mono text-xs', ocrJsonError ? 'border-destructive/70' : undefined)}
                    />
                    {ocrJsonError ? (
                      <p className="text-sm text-destructive">{ocrJsonError}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">JSON можна редагувати напряму або через форму ліворуч.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ocr-raw-json">Raw OCR payload</Label>
                    {receipt.rawOcrJson ? (
                      <Textarea id="ocr-raw-json" value={receipt.rawOcrJson} readOnly className="min-h-48 font-mono text-xs" />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                        Raw OCR payload ще недоступний для цього чека.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/10 text-center">
              <FileDigit className="h-8 w-8 text-primary/70" />
              <div>
                <p className="font-medium">OCR review зʼявиться після Extract або Refresh</p>
                <p className="text-sm text-muted-foreground">Тут буде структурований JSON і поля для ручного уточнення.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-state-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Поточний стан
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {receipt ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge data-testid="dashboard-receipts-status-badge">
                  {statusLabelMap[receipt.status] ?? `Status ${receipt.status}`}
                </Badge>
                <Badge variant="outline" data-testid="dashboard-receipts-publication-badge">
                  {publicationLabelMap[receipt.publicationStatus] ?? `Publication ${receipt.publicationStatus}`}
                </Badge>
                {hasOcrChanges ? <Badge variant="outline">Незбережені OCR правки</Badge> : null}
              </div>

              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">ID</dt>
                  <dd data-testid="dashboard-receipts-state-id" className="break-all font-medium">{receipt.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Файл</dt>
                  <dd data-testid="dashboard-receipts-state-filename" className="font-medium">{receipt.originalFileName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Магазин</dt>
                  <dd data-testid="dashboard-receipts-state-merchant" className="font-medium">{receipt.merchantName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Сума</dt>
                  <dd data-testid="dashboard-receipts-state-total" className="font-medium">{formatAmount(receipt.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Дата покупки</dt>
                  <dd data-testid="dashboard-receipts-state-purchase-date" className="font-medium">{formatDate(receipt.purchaseDateUtc)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Створено</dt>
                  <dd data-testid="dashboard-receipts-state-created-at" className="font-medium">{formatDate(receipt.createdAt)}</dd>
                </div>
              </dl>

              {receipt.verificationFailureReason ? (
                <Alert variant="destructive" data-testid="dashboard-receipts-state-failure-reason">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Причина помилки верифікації</AlertTitle>
                  <AlertDescription>{receipt.verificationFailureReason}</AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground" data-testid="dashboard-receipts-state-empty">
              Ще немає активного чека. Завантажте файл або вставте ID та натисніть Refresh.
            </p>
          )}
        </CardContent>
      </Card>

      {cropSession ? (
        <ImageCropDialog
          open={!!cropSession}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeCropSession(cropSession.fallbackToOriginal);
          }}
          imageSrc={cropSession.src}
          onCropComplete={onCropComplete}
          title={cropSession.kind === 'receipt' ? 'Обріжте чек перед OCR' : 'Обріжте фото товару'}
          description={cropSession.kind === 'receipt'
            ? 'Залиште тільки область чека, щоб OCR не чіпляв фон і зайві предмети.'
            : 'Приберіть зайвий фон і залиште товар у фокусі.'}
        />
      ) : null}
    </div>
  );
}
