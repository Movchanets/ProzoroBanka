import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ExternalLink,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceiptItemsTable } from '@/components/receipt/ReceiptItemsTable';
import {
  useActivateReceipt,
  useAddReceiptItem,
  useAddReceiptItemPhotos,
  useDeleteReceiptItem,
  useDeleteReceiptItemPhoto,
  useExtractReceiptData,
  useGetMyReceipt,
  useImportReceiptTaxXml,
  useLinkReceiptItemPhoto,
  useUpdateReceiptItem,
  useReorderReceiptItemPhotos,
  useReplaceReceiptItemPhoto,
  useRetryReceiptProcessing,
  useUpdateReceiptDraft,
  useUpdateReceiptOcrDraft,
  useUploadReceiptDraft,
  useVerifyReceipt,
} from '@/hooks/queries/useReceipts';
import { useOcrModels } from '@/hooks/queries/useOcrModels';
import {
  type OcrModelConfig,
  ReceiptPublicationStatus,
  type ReceiptItem as PersistedReceiptItem,
  type ReceiptItemPhoto as PersistedReceiptItemPhoto,
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
};

const ocrFieldLabels: Record<keyof typeof emptyOcrDraft, string> = {
  merchantName: 'Магазин',
  totalAmount: 'Сума',
  purchaseDateUtc: 'Дата покупки',
  fiscalNumber: 'Fiscal number',
  receiptCode: 'Receipt code',
  currency: 'Валюта',
};

type OcrDraft = typeof emptyOcrDraft;

interface ItemPhotoAsset {
  id: string;
  previewUrl: string;
  originalFileName: string;
  cropped: boolean;
  source: 'local' | 'server';
  receiptItemId?: string;
  file?: File;
}

interface CropSession {
  kind: 'receipt' | 'item';
  src: string;
  file: File;
  itemId?: string;
  fallbackToOriginal: boolean;
}

interface ItemDraft {
  name: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  barcode: string;
}

function formatAmount(value?: number) {
  if (typeof value !== 'number') return '—';
  const hryvnias = value / 100;
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(hryvnias);
}

function formatAmountInputValue(value?: number) {
  if (typeof value !== 'number') return '';
  return (value / 100).toString();
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = parseReceiptLocalDate(value);
  if (!date) return '—';

  return date.toLocaleString('uk-UA');
}

function parseReceiptLocalDate(value: string) {
  const isoLikeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoLikeMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoLikeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? '0'),
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateTimeLocalValue(value?: string) {
  if (!value) return '';
  const date = parseReceiptLocalDate(value);
  if (!date) return '';
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

function parseOptionalNumber(value: string) {
  const parsed = parseAmount(value);
  return parsed === null ? undefined : parsed;
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
    purchaseDateUtc: draft.purchaseDateUtc ? `${draft.purchaseDateUtc}:00` : null,
    fiscalNumber: normalizeText(draft.fiscalNumber) ?? null,
    receiptCode: normalizeText(draft.receiptCode) ?? null,
    currency: normalizeText(draft.currency) ?? null,
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
    totalAmount: getAmountString(structuredPayload.totalAmount) || formatAmountInputValue(receipt.totalAmount),
    purchaseDateUtc: formatDateTimeLocalValue(getStringValue(structuredPayload.purchaseDateUtc) ?? receipt.purchaseDateUtc),
    fiscalNumber: getStringValue(structuredPayload.fiscalNumber) ?? receipt.fiscalNumber ?? '',
    receiptCode: getStringValue(structuredPayload.receiptCode) ?? receipt.receiptCode ?? '',
    currency: getStringValue(structuredPayload.currency) ?? receipt.currency ?? '',
  };
}

function getReceiptItemsPayload(receipt: ReceiptPipeline | null) {
  return receipt?.ocrStructuredPayloadJson ?? null;
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  return `${baseName}.${extension}`;
}

function isBlobUrl(value: string) {
  return value.startsWith('blob:');
}

function toProxySafeUploadUrl(url: string) {
  if (!url) return url;

  if (url.startsWith('/uploads/')) {
    return url;
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (!parsedUrl.pathname.startsWith('/uploads/')) {
      return url;
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL;
    if (!apiBaseUrl) {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }

    const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
    if (parsedUrl.origin !== apiOrigin) {
      return url;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return url;
  }
}

function revokePreviewUrl(value?: string | null) {
  if (value && isBlobUrl(value)) {
    URL.revokeObjectURL(value);
  }
}

function createLocalItemPhotoAsset(file: File, cropped: boolean, id: string = crypto.randomUUID()): ItemPhotoAsset {
  return {
    id,
    file,
    previewUrl: URL.createObjectURL(file),
    originalFileName: file.name,
    cropped,
    source: 'local',
  };
}

function createPersistedItemPhotoAsset(photo: PersistedReceiptItemPhoto): ItemPhotoAsset {
  return {
    id: photo.id,
    previewUrl: photo.photoUrl,
    originalFileName: photo.originalFileName,
    cropped: true,
    source: 'server',
    receiptItemId: photo.receiptItemId,
  };
}

function buildItemPhotoAssets(receipt: ReceiptPipeline | null) {
  return (receipt?.itemPhotos ?? []).map(createPersistedItemPhotoAsset);
}

export default function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { orgId, receiptId } = useParams<{ orgId: string; receiptId?: string }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTaxXmlFileName, setSelectedTaxXmlFileName] = useState<string>('');
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [selectedFileWasCropped, setSelectedFileWasCropped] = useState(false);
  const [itemPhotos, setItemPhotos] = useState<ItemPhotoAsset[]>([]);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [receiptIdInput, setReceiptIdInput] = useState('');
  const [receipt, setReceipt] = useState<ReceiptPipeline | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [ocrDraft, setOcrDraft] = useState<OcrDraft>(emptyOcrDraft);
  const [hasOcrChanges, setHasOcrChanges] = useState(false);
  const [itemDraft, setItemDraft] = useState<ItemDraft>({
    name: '',
    quantity: '',
    unitPrice: '',
    totalPrice: '',
    barcode: '',
  });
  const [selectedModelIdentifier, setSelectedModelIdentifier] = useState<string>('');
  const selectedFilePreviewRef = useRef<string | null>(null);
  const itemPhotosRef = useRef<ItemPhotoAsset[]>([]);
  const cropSessionRef = useRef<CropSession | null>(null);
  const skippedItemCropIdsRef = useRef<Set<string>>(new Set());

  const uploadDraftMutation = useUploadReceiptDraft();
  const updateDraftMutation = useUpdateReceiptDraft();
  const addItemPhotosMutation = useAddReceiptItemPhotos();
  const addReceiptItemMutation = useAddReceiptItem();
  const deleteReceiptItemMutation = useDeleteReceiptItem();
  const updateReceiptItemMutation = useUpdateReceiptItem();
  const linkItemPhotoMutation = useLinkReceiptItemPhoto();
  const importTaxXmlMutation = useImportReceiptTaxXml();
  const extractMutation = useExtractReceiptData();
  const updateOcrDraftMutation = useUpdateReceiptOcrDraft();
  const verifyMutation = useVerifyReceipt();
  const activateMutation = useActivateReceipt();
  const retryMutation = useRetryReceiptProcessing();
  const replaceItemPhotoMutation = useReplaceReceiptItemPhoto();
  const reorderItemPhotosMutation = useReorderReceiptItemPhotos();
  const deleteItemPhotoMutation = useDeleteReceiptItemPhoto();
  const getReceiptMutation = useGetMyReceipt();
  const { data: ocrModels } = useOcrModels(Boolean(orgId));

  const activeReceiptId = useMemo(
    () => receipt?.id ?? receiptIdInput.trim(),
    [receipt?.id, receiptIdInput],
  );

  const isBusy = uploadDraftMutation.isPending
    || updateDraftMutation.isPending
    || addItemPhotosMutation.isPending
    || addReceiptItemMutation.isPending
    || deleteReceiptItemMutation.isPending
    || linkItemPhotoMutation.isPending
    || importTaxXmlMutation.isPending
    || extractMutation.isPending
    || updateOcrDraftMutation.isPending
    || verifyMutation.isPending
    || activateMutation.isPending
    || retryMutation.isPending
    || replaceItemPhotoMutation.isPending
    || reorderItemPhotosMutation.isPending
    || deleteItemPhotoMutation.isPending
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

  const canRetry = useMemo(() => {
    if (!receipt) return false;

    return receipt.status === ReceiptStatus.FailedVerification
      || receipt.status === ReceiptStatus.InvalidData
      || receipt.status === ReceiptStatus.OcrDeferredMonthlyQuota
      || receipt.status === ReceiptStatus.ValidationDeferredRateLimit;
  }, [receipt]);

  const canExtract = useMemo(() => {
    return !!orgId && !!activeReceiptId && (!!selectedFile || !!receipt?.receiptImageUrl);
  }, [orgId, activeReceiptId, selectedFile, receipt?.receiptImageUrl]);

  useEffect(() => {
    if (!ocrModels || ocrModels.length === 0) {
      setSelectedModelIdentifier('');
      return;
    }

    if (selectedModelIdentifier && ocrModels.some((model) => model.modelIdentifier === selectedModelIdentifier)) {
      return;
    }

    const defaultModel = ocrModels.find((model) => model.isDefault) ?? ocrModels[0];
    setSelectedModelIdentifier(defaultModel?.modelIdentifier ?? '');
  }, [ocrModels, selectedModelIdentifier]);

  useEffect(() => {
    selectedFilePreviewRef.current = selectedFilePreview;
  }, [selectedFilePreview]);

  useEffect(() => {
    itemPhotosRef.current = itemPhotos;
  }, [itemPhotos]);

  useEffect(() => {
    cropSessionRef.current = cropSession;
  }, [cropSession]);

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null);
      setReceiptIdInput('');
      setAliasInput('');
      setOcrDraft(emptyOcrDraft);
      setHasOcrChanges(false);
      setItemDraft({ name: '', quantity: '', unitPrice: '', totalPrice: '', barcode: '' });
      setSelectedFile(null);
      setSelectedFileWasCropped(false);
      replaceSelectedFilePreview(null);
      replaceItemPhotoAssets([]);
      return;
    }

    if (receipt?.id === receiptId) {
      setReceiptIdInput(receiptId);
      return;
    }

    setReceiptIdInput(receiptId);

    if (!orgId) {
      toast.error('Некоректний маршрут: відсутня організація');
      return;
    }

    void getReceiptMutation.mutateAsync({ organizationId: orgId, receiptId })
      .then((result) => {
        applyReceipt(result);
      })
      .catch((error) => {
        toast.error((error as Error).message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, receiptId]);

  useEffect(() => () => {
    revokePreviewUrl(selectedFilePreviewRef.current);
    itemPhotosRef.current.forEach((item) => revokePreviewUrl(item.previewUrl));
    revokePreviewUrl(cropSessionRef.current?.src);
  }, []);

  const hydrateOcrState = (nextReceipt: ReceiptPipeline | null) => {
    const nextDraft = buildOcrDraft(nextReceipt);
    setAliasInput(nextReceipt?.alias ?? '');
    setOcrDraft(nextDraft);
    setHasOcrChanges(false);
    setItemDraft({ name: '', quantity: '', unitPrice: '', totalPrice: '', barcode: '' });
  };

  const applyReceipt = (next: ReceiptPipeline) => {
    setReceipt(next);
    setReceiptIdInput(next.id);
    hydrateOcrState(next);
    replaceItemPhotoAssets(buildItemPhotoAssets(next));
    if (orgId && receiptId !== next.id) {
      navigate(`/dashboard/${orgId}/receipts/${next.id}`, { replace: !receiptId });
    }
  };

  const replaceSelectedFilePreview = (nextPreview: string | null) => {
    setSelectedFilePreview((current) => {
      if (current && current !== nextPreview) revokePreviewUrl(current);
      return nextPreview;
    });
  };

  const replaceItemPhotoAssets = (nextAssets: ItemPhotoAsset[]) => {
    setItemPhotos((current) => {
      current.forEach((item) => {
        const stillPresent = nextAssets.some((next) => next.id === item.id && next.previewUrl === item.previewUrl);
        if (!stillPresent) {
          revokePreviewUrl(item.previewUrl);
        }
      });
      return nextAssets;
    });
  };

  const getNextItemCropCandidate = (
    assets: ItemPhotoAsset[],
    excludeItemId?: string,
  ) => assets.find((item) =>
    item.source === 'local'
    && !item.cropped
    && !!item.file
    && item.id !== excludeItemId
    && !skippedItemCropIdsRef.current.has(item.id));

  const applyReceiptFile = (file: File, previewUrl: string | null, cropped: boolean) => {
    setSelectedFile(file);
    replaceSelectedFilePreview(previewUrl);
    setSelectedFileWasCropped(cropped);
  };

  const persistPendingItemPhotos = async (
    targetReceiptId: string,
    assets: ItemPhotoAsset[] = itemPhotosRef.current,
    showSuccessToast = true,
  ) => {
    const files = assets
      .filter((item) => item.source === 'local' && item.file)
      .map((item) => item.file as File);

    if (files.length === 0) {
      return null;
    }

    const result = await addItemPhotosMutation.mutateAsync({
      receiptId: targetReceiptId,
      files,
    });

    applyReceipt(result);

    if (showSuccessToast) {
      toast.success('Фото товарів збережено');
    }

    return result;
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
      const nextAssets = imageFiles.map((file) => createLocalItemPhotoAsset(file, false));
      nextAssets.forEach((asset) => skippedItemCropIdsRef.current.delete(asset.id));
      replaceItemPhotoAssets([...itemPhotosRef.current, ...nextAssets]);
      const firstAsset = getNextItemCropCandidate(nextAssets);
      if (firstAsset) {
        setCropSession({
          kind: 'item',
          src: URL.createObjectURL(firstAsset.file as File),
          file: firstAsset.file as File,
          itemId: firstAsset.id,
          fallbackToOriginal: false,
        });
      }
      if (!activeReceiptId) {
        toast.info('Фото товарів буде завантажено на backend одразу після створення чернетки чека');
      }
    }
    event.target.value = '';
  };

  const onRemoveItemPhoto = async (itemId: string) => {
    skippedItemCropIdsRef.current.delete(itemId);

    const existing = itemPhotosRef.current.find((item) => item.id === itemId);
    if (!existing) {
      return;
    }

    if (existing.source === 'local') {
      replaceItemPhotoAssets(itemPhotosRef.current.filter((item) => item.id !== itemId));
      return;
    }

    if (!activeReceiptId) {
      return;
    }

    try {
      const result = await deleteItemPhotoMutation.mutateAsync({
        receiptId: activeReceiptId,
        photoId: itemId,
      });
      applyReceipt(result);
      toast.success('Фото товару видалено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onMoveItemPhoto = async (index: number, direction: -1 | 1) => {
    const reordered = (() => {
      const prev = itemPhotosRef.current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    })();

    replaceItemPhotoAssets(reordered);

    const hasOnlyPersistedItems = reordered.length > 0 && reordered.every((item) => item.source === 'server');
    if (!activeReceiptId || !hasOnlyPersistedItems) {
      return;
    }

    try {
      const result = await reorderItemPhotosMutation.mutateAsync({
        receiptId: activeReceiptId,
        payload: { photoIds: reordered.map((item) => item.id) },
      });
      applyReceipt(result);
    } catch (error) {
      toast.error((error as Error).message);
    }
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

  const onRecropItemPhoto = async (item: ItemPhotoAsset) => {
    skippedItemCropIdsRef.current.delete(item.id);

    try {
      const file = item.file ?? await (async () => {
        const response = await fetch(toProxySafeUploadUrl(item.previewUrl), { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Не вдалося завантажити фото товару для перекропу');
        }

        const blob = await response.blob();
        return new File([blob], item.originalFileName, {
          type: blob.type || 'image/webp',
        });
      })();

      setCropSession({
        kind: 'item',
        src: URL.createObjectURL(file),
        file,
        itemId: item.id,
        fallbackToOriginal: false,
      });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const closeCropSession = async (useOriginalOnCancel: boolean) => {
    if (!cropSession) return;
    const currentCropSession = cropSession;

    if (useOriginalOnCancel) {
      if (currentCropSession.kind === 'receipt') {
        applyReceiptFile(
          currentCropSession.file,
          URL.createObjectURL(currentCropSession.file),
          false,
        );
      }
    }

    revokePreviewUrl(currentCropSession.src);
    if (currentCropSession.kind === 'item' && currentCropSession.itemId) {
      skippedItemCropIdsRef.current.add(currentCropSession.itemId);
      const nextItem = getNextItemCropCandidate(itemPhotosRef.current, currentCropSession.itemId);
      if (nextItem) {
        setCropSession({
          kind: 'item',
          src: URL.createObjectURL(nextItem.file as File),
          file: nextItem.file as File,
          itemId: nextItem.id,
          fallbackToOriginal: false,
        });
        return;
      }
    }

    setCropSession(null);

    if (currentCropSession.kind === 'item' && activeReceiptId) {
      try {
        await persistPendingItemPhotos(activeReceiptId);
        skippedItemCropIdsRef.current.clear();
      } catch (error) {
        toast.error((error as Error).message);
      }
    }
  };

  const onCropComplete = async (blob: Blob) => {
    if (!cropSession) return;
    const currentCropSession = cropSession;

    const croppedFile = new File(
      [blob],
      replaceExtension(currentCropSession.file.name, 'webp'),
      { type: 'image/webp' },
    );

    if (currentCropSession.kind === 'receipt') {
      applyReceiptFile(croppedFile, URL.createObjectURL(croppedFile), true);
      revokePreviewUrl(currentCropSession.src);
      setCropSession(null);
      return;
    }

    const croppedItemId = currentCropSession.itemId;
    const existingItem = croppedItemId
      ? itemPhotosRef.current.find((item) => item.id === croppedItemId)
      : null;

    if (croppedItemId) {
      skippedItemCropIdsRef.current.delete(croppedItemId);
    }

    revokePreviewUrl(currentCropSession.src);

    if (!croppedItemId || !existingItem) {
      setCropSession(null);
      return;
    }

    if (existingItem.source === 'server' && activeReceiptId) {
      try {
        const result = await replaceItemPhotoMutation.mutateAsync({
          receiptId: activeReceiptId,
          photoId: croppedItemId,
          file: croppedFile,
        });
        applyReceipt(result);
        toast.success('Фото товару оновлено');
      } catch (error) {
        toast.error((error as Error).message);
      }
      setCropSession(null);
      return;
    }

    const nextAssets = itemPhotosRef.current.map((item) => {
      if (item.id !== croppedItemId) {
        return item;
      }

      revokePreviewUrl(item.previewUrl);
      return createLocalItemPhotoAsset(croppedFile, true, croppedItemId);
    });

    replaceItemPhotoAssets(nextAssets);

    const nextItem = getNextItemCropCandidate(nextAssets, croppedItemId);
    if (nextItem) {
      setCropSession({
        kind: 'item',
        src: URL.createObjectURL(nextItem.file as File),
        file: nextItem.file as File,
        itemId: nextItem.id,
        fallbackToOriginal: false,
      });
      return;
    }

    setCropSession(null);

    if (activeReceiptId) {
      try {
        await persistPendingItemPhotos(activeReceiptId, nextAssets);
        skippedItemCropIdsRef.current.clear();
      } catch (error) {
        toast.error((error as Error).message);
      }
    }
  };

  const onChangeOcrField = (field: keyof OcrDraft, value: string) => {
    const nextDraft = { ...ocrDraft, [field]: value };
    setOcrDraft(nextDraft);
    setHasOcrChanges(true);
  };

  const onResetOcrDraft = () => {
    hydrateOcrState(receipt);
    toast.success('OCR draft синхронізовано з поточним станом чека');
  };

  const onUploadDraft = async () => {
    if (!orgId) {
      toast.error('Некоректний маршрут: відсутня організація');
      return;
    }

    if (!selectedFile) {
      toast.error('Оберіть файл чека для завантаження');
      return;
    }

    try {
      const baseReceipt = isUpdateDraftMode && receipt?.id
        ? await updateDraftMutation.mutateAsync({ receiptId: receipt.id, file: selectedFile })
        : await uploadDraftMutation.mutateAsync({ organizationId: orgId, file: selectedFile });

      const finalReceipt = await persistPendingItemPhotos(
        baseReceipt.id,
        itemPhotosRef.current,
        false,
      ) ?? baseReceipt;

      applyReceipt(finalReceipt);
      toast.success(
        finalReceipt.itemPhotos?.length
          ? isUpdateDraftMode
            ? 'Чернетку чека оновлено, фото товарів синхронізовано'
            : 'Чернетку чека та фото товарів завантажено'
          : isUpdateDraftMode
            ? 'Чернетку чека оновлено'
            : 'Чернетку чека завантажено',
      );
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onTaxXmlSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const xmlFile = event.target.files?.[0];
    if (!xmlFile) {
      return;
    }

    await importTaxXmlFile(xmlFile);
    event.target.value = '';
  };

  const importTaxXmlFile = async (xmlFile: File) => {
    setSelectedTaxXmlFileName(xmlFile.name);

    if (!activeReceiptId) {
      toast.error('Спочатку створіть або відкрийте чек');
      return;
    }

    try {
      const result = await importTaxXmlMutation.mutateAsync({
        receiptId: activeReceiptId,
        file: xmlFile,
      });
      applyReceipt(result);
      toast.success('XML чека імпортовано');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onTaxXmlDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const xmlFile = Array.from(event.dataTransfer.files).find((file) => file.name.toLowerCase().endsWith('.xml'));
    if (!xmlFile) {
      toast.error('Перетягніть XML-файл чека');
      return;
    }

    await importTaxXmlFile(xmlFile);
  };

  const onAddReceiptItem = async () => {
    if (!activeReceiptId) {
      toast.error('Спочатку створіть або відкрийте чек');
      return;
    }

    const name = itemDraft.name.trim();
    if (!name) {
      toast.error('Вкажіть назву позиції');
      return;
    }

    try {
      const parsedUnitPrice = parseOptionalNumber(itemDraft.unitPrice);
      const parsedTotalPrice = parseOptionalNumber(itemDraft.totalPrice);

      const result = await addReceiptItemMutation.mutateAsync({
        receiptId: activeReceiptId,
        payload: {
          name,
          quantity: parseOptionalNumber(itemDraft.quantity),
          unitPrice: parsedUnitPrice === undefined ? undefined : Math.round(parsedUnitPrice * 100),
          totalPrice: parsedTotalPrice === undefined ? undefined : Math.round(parsedTotalPrice * 100),
          barcode: itemDraft.barcode.trim() || undefined,
        },
      });

      applyReceipt(result);
      setItemDraft({
        name: '',
        quantity: '',
        unitPrice: '',
        totalPrice: '',
        barcode: '',
      });
      toast.success('Позицію додано');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onUpdateReceiptItem = async (itemId: string, payload: {
    name: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    barcode?: string;
    vatRate?: number;
    vatAmount?: number;
  }) => {
    if (!activeReceiptId) {
      return;
    }

    const result = await updateReceiptItemMutation.mutateAsync({
      receiptId: activeReceiptId,
      itemId,
      payload: {
        name: payload.name,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        totalPrice: payload.totalPrice,
        barcode: payload.barcode,
        vatRate: payload.vatRate,
        vatAmount: payload.vatAmount,
      },
    });

    applyReceipt(result);
  };

  const onDeleteReceiptItem = async (itemId: string) => {
    if (!activeReceiptId) {
      return;
    }

    const confirmed = window.confirm('Видалити позицію товару?');
    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteReceiptItemMutation.mutateAsync({
        receiptId: activeReceiptId,
        itemId,
      });
      applyReceipt(result);
      toast.success('Позицію видалено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onOpenVerificationLink = () => {
    if (!receipt?.verificationUrl) {
      toast.error('Посилання перевірки ДПС недоступне');
      return;
    }

    window.open(receipt.verificationUrl, '_blank', 'noopener,noreferrer');
  };

  const onLinkPhotoToItem = async (photoId: string, receiptItemId?: string) => {
    if (!activeReceiptId) {
      return;
    }

    try {
      const result = await linkItemPhotoMutation.mutateAsync({
        receiptId: activeReceiptId,
        photoId,
        payload: { receiptItemId },
      });
      applyReceipt(result);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const resolveExtractFile = async () => {
    if (selectedFile) {
      return selectedFile;
    }

    return undefined;
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

    try {
      const fileForExtract = await resolveExtractFile();
      if (!fileForExtract && !receipt?.receiptImageUrl) {
        toast.error('Додайте або завантажте файл чека перед OCR етапом');
        return;
      }

      const result = await extractMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
        file: fileForExtract,
        modelIdentifier: selectedModelIdentifier || undefined,
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

    const normalizedJson = buildJsonFromDraft(ocrDraft);

    try {
      const draftTotalAmount = parseAmount(ocrDraft.totalAmount);

      const result = await updateOcrDraftMutation.mutateAsync({
        receiptId: activeReceiptId,
        payload: {
          alias: normalizeText(aliasInput),
          merchantName: normalizeText(ocrDraft.merchantName),
          totalAmount: draftTotalAmount === null ? null : Math.round(draftTotalAmount * 100),
          purchaseDateUtc: ocrDraft.purchaseDateUtc ? `${ocrDraft.purchaseDateUtc}:00` : null,
          fiscalNumber: normalizeText(ocrDraft.fiscalNumber),
          receiptCode: normalizeText(ocrDraft.receiptCode),
          currency: normalizeText(ocrDraft.currency),
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

    if (!orgId) {
      toast.error('Некоректний маршрут: відсутня організація');
      return;
    }

    try {
      const result = await getReceiptMutation.mutateAsync({ organizationId: orgId, receiptId: activeReceiptId });
      applyReceipt(result);
      toast.success('Стан чека оновлено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const displayedReceiptPreview = selectedFilePreview ?? receipt?.receiptImageUrl ?? null;
  const displayedReceiptFileName = selectedFile?.name ?? receipt?.originalFileName ?? '';
  const isUpdateDraftMode = !!receipt?.id;

  return (
    <div className="space-y-6" data-testid="dashboard-receipts-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="dashboard-receipts-title">
            <Receipt className="h-6 w-6 text-primary" />
            {receiptId ? 'Картка чека' : 'Новий чек'}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground" data-testid="dashboard-receipts-subtitle">
            {receiptId
              ? 'Тут можна доповнити alias, підправити OCR, виконати verify і підготувати чек до прикріплення в збір.'
              : 'Створіть новий чек, обріжте зображення, перевірте OCR і задайте alias для швидкого пошуку в campaigns.'}
          </p>
        </div>

        {orgId ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(`/dashboard/${orgId}/receipts`)} data-testid="dashboard-receipts-back-to-list-button">
              <ArrowLeft className="h-4 w-4" />
              До реєстру
            </Button>
            {receiptId ? (
              <Button type="button" onClick={() => navigate(`/dashboard/${orgId}/receipts/new`)} data-testid="dashboard-receipts-create-another-button">
                Створити ще один
              </Button>
            ) : null}
          </div>
        ) : null}
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
            Файл чека
          </CardTitle>
          <CardDescription>Завантажте чек та застосуйте crop перед OCR.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              {displayedReceiptPreview ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-background" data-testid="dashboard-receipts-upload-preview">
                    <img src={displayedReceiptPreview} alt="Попередній перегляд чека" className="max-h-80 w-full object-contain" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{displayedReceiptFileName}</span>
                    <Badge variant="outline">{selectedFileWasCropped ? 'Обрізано' : 'Оригінал'}</Badge>
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
            <div className="rounded-2xl border border-border/70 bg-muted/10 p-3">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border/60 bg-background" data-testid="dashboard-receipts-upload-preview">
                  <img src={displayedReceiptPreview} alt="Серверний preview чека" className="max-h-80 w-full object-contain" />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{displayedReceiptFileName}</span>
                  <Badge variant="outline">З backend</Badge>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onUploadDraft}
              disabled={!selectedFile || isBusy}
              data-testid="dashboard-receipts-upload-button"
            >
              {uploadDraftMutation.isPending || updateDraftMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUpdateDraftMode ? 'Оновити чернетку' : 'Завантажити чернетку'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedFile || !selectedFilePreview || isBusy}
              onClick={onRecropReceipt}
              data-testid="dashboard-receipts-recrop-button"
            >
              <Crop className="h-4 w-4" />
              Перекропити
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-items-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileImage className="h-5 w-5 text-primary" />
            Purchased items
          </CardTitle>
          <CardDescription>Окрема секція для фото товарів і прив'язки до позицій чека.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                      <img src={photo.previewUrl} alt={photo.originalFileName} className="h-full w-full object-cover" />
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold">#{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="truncate text-sm font-medium" title={photo.originalFileName}>{photo.originalFileName}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`dashboard-receipts-items-source-${index}`}>
                          {photo.source === 'server'
                            ? 'Збережено на backend'
                            : photo.cropped
                              ? 'Кроп застосовано'
                              : 'Очікує завантаження'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => void onMoveItemPhoto(index, -1)}>
                          <ArrowUp className="h-4 w-4" />
                          Вище
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={index === itemPhotos.length - 1} onClick={() => void onMoveItemPhoto(index, 1)}>
                          <ArrowDown className="h-4 w-4" />
                          Нижче
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void onRecropItemPhoto(photo)}>
                          <Crop className="h-4 w-4" />
                          {photo.source === 'server' ? 'Перекропити' : 'Кроп'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => void onRemoveItemPhoto(photo.id)} data-testid={`dashboard-receipts-items-remove-${index}`}>
                          <X className="h-4 w-4" />
                          Видалити
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`dashboard-receipts-photo-item-link-${index}`}>Пов'язати з позицією</Label>
                        <Select
                          value={photo.receiptItemId ?? 'none'}
                          onValueChange={(value) => {
                            if (photo.source !== 'server') {
                              return;
                            }

                            void onLinkPhotoToItem(photo.id, value === 'none' ? undefined : value);
                          }}
                          disabled={photo.source !== 'server' || !(receipt?.items?.length)}
                        >
                          <SelectTrigger id={`dashboard-receipts-photo-item-link-${index}`} data-testid={`dashboard-receipts-photo-item-link-${index}`}>
                            <SelectValue placeholder="Не прив'язано" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не прив'язано</SelectItem>
                            {(receipt?.items ?? []).map((item: PersistedReceiptItem) => (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                                data-testid={`dashboard-receipts-photo-item-option-${item.id}`}
                              >
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-actions-card">
        <CardHeader>
          <CardTitle className="text-lg">Керування pipeline</CardTitle>
          <CardDescription>Extract, OCR review, verify, activate, повторна обробка після помилок та ручне оновлення статусу одного конкретного чека.</CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="tax-xml-file">XML з податкового кабінету</Label>
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
              onDrop={(event) => void onTaxXmlDrop(event)}
              data-testid="dashboard-receipts-tax-xml-dropzone"
            >
              Перетягніть XML-файл сюди для імпорту.
              {selectedTaxXmlFileName ? (
                <div className="mt-1 text-foreground" data-testid="dashboard-receipts-tax-xml-selected-name">
                  Обрано: {selectedTaxXmlFileName}
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <div className="sm:col-span-2 xl:col-span-2 space-y-1">
              <Label htmlFor="dashboard-receipts-ocr-model-select">OCR модель</Label>
              <Select value={selectedModelIdentifier} onValueChange={setSelectedModelIdentifier}>
                <SelectTrigger id="dashboard-receipts-ocr-model-select" data-testid="dashboard-receipts-ocr-model-select">
                  <SelectValue placeholder="Оберіть OCR модель" />
                </SelectTrigger>
                <SelectContent>
                  {(ocrModels ?? []).map((model: OcrModelConfig) => (
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
            <Button
              onClick={onExtract}
              disabled={!canExtract || isBusy}
              data-testid="dashboard-receipts-extract-button"
            >
              Extract
            </Button>
            <div className="space-y-1">
              <p className="text-xs text-amber-500" data-testid="dashboard-receipts-verify-warning">
                Увага: під час воєнного стану публічне API ДПС може бути недоступним.
              </p>
              <Button
                onClick={onVerify}
                disabled={!orgId || !activeReceiptId || isBusy}
                data-testid="dashboard-receipts-verify-button"
              >
                Verify
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenVerificationLink}
              disabled={!receipt?.verificationUrl || isBusy}
              data-testid="dashboard-receipts-open-verification-link-button"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Перевірити посилання
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
              disabled={!activeReceiptId || !canRetry || isBusy}
              title={!canRetry && activeReceiptId ? 'Доступно для статусів помилок та відкладених обробок' : undefined}
              data-testid="dashboard-receipts-retry-button"
            >
              Повторити обробку
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
                    <Label htmlFor="ocr-alias">Alias чека</Label>
                    <Input
                      id="ocr-alias"
                      value={aliasInput}
                      onChange={(event) => {
                        setAliasInput(event.target.value);
                        setHasOcrChanges(true);
                      }}
                      placeholder="Наприклад: Фудком / Coca-Cola / 05.04"
                      data-testid="dashboard-receipts-alias-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alias використовується у реєстрі чеків і в campaigns attach receipt, щоб чек було легко знайти.
                    </p>
                  </div>
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
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <Button onClick={onSaveOcrDraft} disabled={!activeReceiptId || isBusy || !hasOcrChanges} data-testid="dashboard-receipts-save-ocr-button">
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
                    <Label>Позиції товарів</Label>
                    <div className="grid gap-2 md:grid-cols-5" data-testid="dashboard-receipts-add-item-form">
                      <Input
                        value={itemDraft.name}
                        onChange={(event) => setItemDraft((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Назва"
                        data-testid="dashboard-receipts-add-item-name-input"
                      />
                      <Input
                        value={itemDraft.quantity}
                        onChange={(event) => setItemDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                        placeholder="К-ть"
                        data-testid="dashboard-receipts-add-item-quantity-input"
                      />
                      <Input
                        value={itemDraft.unitPrice}
                        onChange={(event) => setItemDraft((prev) => ({ ...prev, unitPrice: event.target.value }))}
                        placeholder="Ціна"
                        data-testid="dashboard-receipts-add-item-unit-price-input"
                      />
                      <Input
                        value={itemDraft.totalPrice}
                        onChange={(event) => setItemDraft((prev) => ({ ...prev, totalPrice: event.target.value }))}
                        placeholder="Сума"
                        data-testid="dashboard-receipts-add-item-total-price-input"
                      />
                      <Input
                        value={itemDraft.barcode}
                        onChange={(event) => setItemDraft((prev) => ({ ...prev, barcode: event.target.value }))}
                        placeholder="Штрихкод"
                        data-testid="dashboard-receipts-add-item-barcode-input"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onAddReceiptItem()}
                      disabled={!activeReceiptId || isBusy}
                      data-testid="dashboard-receipts-add-item-button"
                    >
                      Додати позицію
                    </Button>
                    <ReceiptItemsTable
                      items={receipt.items}
                      structuredOutputJson={getReceiptItemsPayload(receipt)}
                      testIdPrefix="dashboard-receipts-items"
                      onUpdateItem={(itemId, payload) => onUpdateReceiptItem(itemId, payload)}
                      onDeleteItem={(itemId) => onDeleteReceiptItem(itemId)}
                    />
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
                {receipt.isConfirmed ? (
                  <Badge variant="secondary" data-testid="dashboard-receipts-confirmed-badge">Підтверджено</Badge>
                ) : null}
                <Badge variant="outline" data-testid="dashboard-receipts-publication-badge">
                  {publicationLabelMap[receipt.publicationStatus] ?? `Publication ${receipt.publicationStatus}`}
                </Badge>
                {receipt.campaignId && orgId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/${orgId}/campaigns/${receipt.campaignId}`)}
                  >
                    {receipt.campaignTitle || 'Відкритий збір'}
                  </Button>
                ) : null}
                {hasOcrChanges ? <Badge variant="outline">Незбережені OCR правки</Badge> : null}
              </div>

              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Alias</dt>
                  <dd className="font-medium">{receipt.alias || '—'}</dd>
                </div>
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
                <div>
                  <dt className="text-muted-foreground">Збір</dt>
                  <dd className="font-medium">{receipt.campaignTitle || 'Не прикріплено'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Посилання перевірки ДПС</dt>
                  <dd className="font-medium" data-testid="dashboard-receipts-state-verification-link">
                    {receipt.verificationUrl ? (
                      <a
                        href={receipt.verificationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        Відкрити перевірку
                      </a>
                    ) : '—'}
                  </dd>
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
              Ще немає активного чека. Створіть новий або відкрийте чек із реєстру.
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
