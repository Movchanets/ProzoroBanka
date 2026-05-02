import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useActivateReceipt,
  useAddReceiptItem,
  useAddReceiptItemPhotos,
  useDeleteReceiptItem,
  useDeleteReceiptItemPhoto,
  useExtractReceiptData,
  useImportReceiptTaxXml,
  useLinkReceiptItemPhoto,
  useUpdateReceiptItem,
  useReorderReceiptItemPhotos,
  useReplaceReceiptItemPhoto,
  useRetryReceiptProcessing,
  useUpdateReceiptDraft,
  useUpdateReceiptOcrDraft,
  useUploadReceiptDraft,
  useReceiptDetail,
  useVerifyReceipt,
  useGetMyReceipt,
} from '@/hooks/queries/useReceipts';
import { useOcrModels } from '@/hooks/queries/useOcrModels';
import {
  ReceiptStatus,
  type ReceiptItemPhoto as PersistedReceiptItemPhoto,
  type ReceiptPipeline,
  type UpdateReceiptItemRequest,
} from '@/types';

const emptyOcrDraft = {
  merchantName: '',
  totalAmount: '',
  purchaseDateUtc: '',
  fiscalNumber: '',
  receiptCode: '',
  currency: '',
};

const ocrFieldLabelKeyMap: Record<keyof typeof emptyOcrDraft, string> = {
  merchantName: 'merchantName',
  totalAmount: 'totalAmount',
  purchaseDateUtc: 'purchaseDateUtc',
  fiscalNumber: 'fiscalNumber',
  receiptCode: 'receiptCode',
  currency: 'currency',
};

export type OcrDraft = typeof emptyOcrDraft;

export interface ItemPhotoAsset {
  id: string;
  previewUrl: string;
  originalFileName: string;
  cropped: boolean;
  source: 'local' | 'server';
  receiptItemId?: string;
  file?: File;
}

export interface CropSession {
  kind: 'receipt' | 'item';
  src: string;
  file: File;
  itemId?: string;
  fallbackToOriginal: boolean;
}

export interface ItemDraft {
  name: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  barcode: string;
}

interface UseReceiptDetailControllerParams {
  orgId?: string;
  receiptId?: string;
  onReceiptRouteSync: (nextReceiptId: string, replace: boolean) => void;
}

function formatAmountInputValue(value?: number) {
  if (typeof value !== 'number') return '';
  return (value / 100).toString();
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

export function getReceiptItemsPayload(receipt: ReceiptPipeline | null) {
  return receipt?.ocrStructuredPayloadJson ?? null;
}

export function useReceiptDetailController({
  orgId,
  receiptId,
  onReceiptRouteSync,
}: UseReceiptDetailControllerParams) {
  const { t } = useTranslation();

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
  const [isReextractDialogOpen, setIsReextractDialogOpen] = useState(false);
  const [hasPendingExtractRequest, setHasPendingExtractRequest] = useState(false);
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
  const { data: queryReceipt } = useReceiptDetail(
    orgId ?? '',
    receiptId ?? '',
    Boolean(orgId && receiptId && receiptId !== 'new'),
    (query: any) => (query?.state?.data?.status === ReceiptStatus.PendingOcr ? 3000 : false),
  );
  const { data: ocrModels } = useOcrModels(Boolean(orgId));

  const activeReceiptId = useMemo(
    () => receipt?.id ?? receiptIdInput.trim(),
    [receipt?.id, receiptIdInput],
  );

  const isActionBusy = uploadDraftMutation.isPending
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

  const isPendingOcr = receipt?.status === ReceiptStatus.PendingOcr;

  const missingOcrFields = useMemo(() => {
    const missing = Object.entries(ocrDraft)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => t(`receipts.detail.ocr.fields.${ocrFieldLabelKeyMap[key as keyof OcrDraft]}`));

    if (!ocrDraft.fiscalNumber.trim() && !ocrDraft.receiptCode.trim()) {
      const fiscalLabel = t(`receipts.detail.ocr.fields.${ocrFieldLabelKeyMap.fiscalNumber}`);
      const receiptCodeLabel = t(`receipts.detail.ocr.fields.${ocrFieldLabelKeyMap.receiptCode}`);
      return missing.filter((label) => label !== fiscalLabel && label !== receiptCodeLabel)
        .concat(t('receipts.detail.ocr.fields.fiscalOrReceiptCode'));
    }

    return missing;
  }, [ocrDraft, t]);

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

  const isExtractTemporarilyLocked = isPendingOcr && hasPendingExtractRequest;

  const requiresExtractConfirmation = useMemo(() => {
    if (!receipt) return false;

    return receipt.status === ReceiptStatus.OcrExtracted
      || receipt.status === ReceiptStatus.InvalidData
      || receipt.status === ReceiptStatus.FailedVerification
      || receipt.status === ReceiptStatus.ValidationDeferredRateLimit
      || receipt.status === ReceiptStatus.StateVerified;
  }, [receipt]);

  const isUpdateDraftMode = !!receipt?.id;

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

  const hydrateOcrState = (nextReceipt: ReceiptPipeline | null) => {
    const nextDraft = buildOcrDraft(nextReceipt);
    setAliasInput(nextReceipt?.alias ?? '');
    setOcrDraft(nextDraft);
    setHasOcrChanges(false);
    setItemDraft({ name: '', quantity: '', unitPrice: '', totalPrice: '', barcode: '' });
  };

  useEffect(() => {
    if (queryReceipt) {
      setReceipt(queryReceipt);
      setReceiptIdInput(queryReceipt.id);
      hydrateOcrState(queryReceipt);
      replaceItemPhotoAssets(buildItemPhotoAssets(queryReceipt));
    }
  }, [queryReceipt]);

  const applyReceipt = (next: ReceiptPipeline) => {
    setReceipt(next);
    setReceiptIdInput(next.id);
    hydrateOcrState(next);
    replaceItemPhotoAssets(buildItemPhotoAssets(next));

    if (orgId && receiptId !== next.id) {
      onReceiptRouteSync(next.id, !receiptId);
    }
  };

  useEffect(() => {
    if (!receiptId || receiptId === 'new') {
      setReceipt(null);
      setReceiptIdInput('');
      setAliasInput('');
      setOcrDraft(emptyOcrDraft);
      setHasOcrChanges(false);
      setHasPendingExtractRequest(false);
      setItemDraft({ name: '', quantity: '', unitPrice: '', totalPrice: '', barcode: '' });
      setSelectedFile(null);
      setSelectedFileWasCropped(false);
      replaceSelectedFilePreview(null);
      replaceItemPhotoAssets([]);
      return;
    }

    setReceiptIdInput(receiptId);
  }, [receiptId]);

  useEffect(() => () => {
    revokePreviewUrl(selectedFilePreviewRef.current);
    itemPhotosRef.current.forEach((item) => revokePreviewUrl(item.previewUrl));
    revokePreviewUrl(cropSessionRef.current?.src);
  }, []);

  useEffect(() => {
    if (receipt?.status !== ReceiptStatus.PendingOcr && hasPendingExtractRequest) {
      setHasPendingExtractRequest(false);
    }
  }, [receipt?.status, hasPendingExtractRequest]);

  useEffect(() => {
    if (receipt?.status !== ReceiptStatus.PendingOcr && previousStatusRef.current === ReceiptStatus.PendingOcr) {
      const isSuccess = receipt?.status === ReceiptStatus.OcrExtracted;
      toast[isSuccess ? 'success' : 'info'](
        isSuccess
          ? t('receipts.detail.toasts.ocrFinished')
          : t('receipts.detail.toasts.ocrStatusUpdated'),
      );
    }
    previousStatusRef.current = receipt?.status;
  }, [receipt?.status, t]);

  const previousStatusRef = useRef<ReceiptStatus | undefined>(receipt?.status);

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
      toast.success(t('receipts.detail.toasts.itemPhotosSaved'));
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
      toast.error(t('receipts.detail.toasts.itemPhotosImagesOnly'));
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
        toast.info(t('receipts.detail.toasts.itemPhotosWillUploadAfterDraft'));
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
      toast.success(t('receipts.detail.toasts.itemPhotoDeleted'));
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
          throw new Error(t('receipts.detail.toasts.itemPhotoRecropLoadFailed'));
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

  const onRecropItemPhotoById = async (itemId: string) => {
    const target = itemPhotosRef.current.find((item) => item.id === itemId);
    if (!target) {
      return;
    }

    await onRecropItemPhoto(target);
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
        toast.success(t('receipts.detail.toasts.itemPhotoUpdated'));
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
    toast.success(t('receipts.detail.toasts.ocrDraftReset'));
  };

  const onUploadDraft = async () => {
    if (!orgId) {
      toast.error(t('receipts.detail.toasts.routeMissingOrganization'));
      return;
    }

    if (!selectedFile) {
      toast.error(t('receipts.detail.toasts.selectReceiptFile'));
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
            ? t('receipts.detail.toasts.draftUpdatedWithItemPhotos')
            : t('receipts.detail.toasts.draftUploadedWithItemPhotos')
          : isUpdateDraftMode
            ? t('receipts.detail.toasts.draftUpdated')
            : t('receipts.detail.toasts.draftUploaded'),
      );
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const importTaxXmlFile = async (xmlFile: File) => {
    setSelectedTaxXmlFileName(xmlFile.name);

    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.openOrCreateReceiptFirst'));
      return;
    }

    try {
      const result = await importTaxXmlMutation.mutateAsync({
        receiptId: activeReceiptId,
        file: xmlFile,
      });
      applyReceipt(result);
      toast.success(t('receipts.detail.toasts.taxXmlImported'));
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

  const onTaxXmlDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const xmlFile = Array.from(event.dataTransfer.files).find((file) => file.name.toLowerCase().endsWith('.xml'));
    if (!xmlFile) {
      toast.error(t('receipts.detail.toasts.dropTaxXmlFile'));
      return;
    }

    await importTaxXmlFile(xmlFile);
  };

  const onAddReceiptItem = async () => {
    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.openOrCreateReceiptFirst'));
      return;
    }

    const name = itemDraft.name.trim();
    if (!name) {
      toast.error(t('receipts.detail.toasts.itemNameRequired'));
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
          unitPrice: parsedUnitPrice,
          totalPrice: parsedTotalPrice,
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
      toast.success(t('receipts.detail.toasts.itemAdded'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onUpdateReceiptItem = async (itemId: string, payload: UpdateReceiptItemRequest) => {
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

    const confirmed = window.confirm(t('receipts.detail.dialogs.confirmDeleteItem'));
    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteReceiptItemMutation.mutateAsync({
        receiptId: activeReceiptId,
        itemId,
      });
      applyReceipt(result);
      toast.success(t('receipts.detail.toasts.itemDeleted'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onOpenVerificationLink = () => {
    if (!receipt?.verificationUrl) {
      toast.error(t('receipts.detail.toasts.taxVerificationLinkUnavailable'));
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

  const onExtract = async (force = false) => {
    if (!orgId) {
      toast.error(t('receipts.detail.toasts.organizationMissingInUrl'));
      return;
    }

    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.receiptIdRequired'));
      return;
    }

    try {
      const fileForExtract = await resolveExtractFile();
      if (!fileForExtract && !receipt?.receiptImageUrl) {
        toast.error(t('receipts.detail.toasts.uploadReceiptFileBeforeOcr'));
        return;
      }

      if (requiresExtractConfirmation && !force) {
        setIsReextractDialogOpen(true);
        return;
      }

      const result = await extractMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
        file: fileForExtract,
        modelIdentifier: selectedModelIdentifier || undefined,
      });
      setHasPendingExtractRequest(true);
      setIsReextractDialogOpen(false);
      applyReceipt(result);
      toast.info(t('receipts.detail.toasts.ocrStarted'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onConfirmReextract = () => {
    void onExtract(true);
  };

  const onSaveOcrDraft = async () => {
    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.uploadOrSelectReceiptFirst'));
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
      toast.success(t('receipts.detail.toasts.ocrDraftSaved'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onVerify = async () => {
    if (!orgId) {
      toast.error(t('receipts.detail.toasts.organizationMissingInUrl'));
      return;
    }

    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.receiptIdRequired'));
      return;
    }

    try {
      const result = await verifyMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
      });
      applyReceipt(result);
      toast.success(t('receipts.detail.toasts.verificationCompleted'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onActivate = async () => {
    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.receiptIdRequired'));
      return;
    }

    try {
      const result = await activateMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success(t('receipts.detail.toasts.receiptActivated'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRetry = async () => {
    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.receiptIdRequired'));
      return;
    }

    try {
      const result = await retryMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success(t('receipts.detail.toasts.retryStarted'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRefresh = async () => {
    if (!activeReceiptId) {
      toast.error(t('receipts.detail.toasts.receiptIdRequired'));
      return;
    }

    if (!orgId) {
      toast.error(t('receipts.detail.toasts.routeMissingOrganization'));
      return;
    }

    try {
      const result = await getReceiptMutation.mutateAsync({ organizationId: orgId, receiptId: activeReceiptId });
      applyReceipt(result);
      toast.success(t('receipts.detail.toasts.receiptStateRefreshed'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const displayedReceiptPreview = selectedFilePreview ?? receipt?.receiptImageUrl ?? null;
  const displayedReceiptFileName = selectedFile?.name ?? receipt?.originalFileName ?? '';

  return {
    selectedFile,
    selectedTaxXmlFileName,
    selectedFileWasCropped,
    itemPhotos,
    cropSession,
    receiptIdInput,
    setReceiptIdInput,
    receipt,
    aliasInput,
    setAliasInput,
    ocrDraft,
    hasOcrChanges,
    setHasOcrChanges,
    isReextractDialogOpen,
    setIsReextractDialogOpen,
    itemDraft,
    setItemDraft,
    selectedModelIdentifier,
    setSelectedModelIdentifier,
    ocrModels,
    activeReceiptId,
    isActionBusy,
    isPendingOcr,
    missingOcrFields,
    canRetry,
    canExtract,
    isExtractTemporarilyLocked,
    isUpdateDraftMode,
    displayedReceiptPreview,
    displayedReceiptFileName,
    isExtractPending: extractMutation.isPending,
    isUploadDraftPending: uploadDraftMutation.isPending,
    isUpdateDraftPending: updateDraftMutation.isPending,
    isSaveOcrDraftPending: updateOcrDraftMutation.isPending,
    onReceiptFileSelected,
    onUploadDraft,
    onRecropReceipt,
    onItemPhotosSelected,
    onMoveItemPhoto,
    onRecropItemPhotoById,
    onRemoveItemPhoto,
    onLinkPhotoToItem,
    onTaxXmlSelected,
    onTaxXmlDrop,
    onExtract,
    onVerify,
    onOpenVerificationLink,
    onActivate,
    onRetry,
    onRefresh,
    onChangeOcrField,
    onSaveOcrDraft,
    onResetOcrDraft,
    onAddReceiptItem,
    onUpdateReceiptItem,
    onDeleteReceiptItem,
    onConfirmReextract,
    closeCropSession,
    onCropComplete,
  };
}
