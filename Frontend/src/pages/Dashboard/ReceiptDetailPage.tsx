import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertCircle,
} from 'lucide-react';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import {
  getReceiptItemsPayload,
  useReceiptDetailController,
} from '@/pages/Dashboard/hooks/useReceiptDetailController';
import { ReceiptDetailHeader } from '@/pages/Dashboard/components/receipt-detail/ReceiptDetailHeader';
import { ReceiptItemPhotosCard } from '@/pages/Dashboard/components/receipt-detail/ReceiptItemPhotosCard';
import { ReceiptOcrEditorCard } from '@/pages/Dashboard/components/receipt-detail/ReceiptOcrEditorCard';
import { ReceiptPipelineActionsCard } from '@/pages/Dashboard/components/receipt-detail/ReceiptPipelineActionsCard';
import { ReceiptReextractDialog } from '@/pages/Dashboard/components/receipt-detail/ReceiptReextractDialog';
import { ReceiptStateCard } from '@/pages/Dashboard/components/receipt-detail/ReceiptStateCard';
import { ReceiptUploadCard } from '@/pages/Dashboard/components/receipt-detail/ReceiptUploadCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ReceiptPublicationStatus,
  ReceiptStatus,
} from '@/types';

const statusLabelKeyMap: Record<number, string> = {
  [ReceiptStatus.PendingOcr]: 'pendingOcr',
  [ReceiptStatus.PendingStateValidation]: 'pendingStateValidation',
  [ReceiptStatus.OcrExtracted]: 'ocrExtracted',
  [ReceiptStatus.FailedVerification]: 'failedVerification',
  [ReceiptStatus.ValidationDeferredRateLimit]: 'deferredRateLimit',
  [ReceiptStatus.Draft]: 'draft',
  [ReceiptStatus.StateVerified]: 'stateVerified',
  [ReceiptStatus.InvalidData]: 'invalidData',
  [ReceiptStatus.OcrDeferredMonthlyQuota]: 'deferredMonthlyQuota',
};

const publicationLabelKeyMap: Record<number, string> = {
  [ReceiptPublicationStatus.Draft]: 'draft',
  [ReceiptPublicationStatus.Active]: 'active',
};

export default function ReceiptDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const orgId = typeof params.orgId === 'string' ? params.orgId : '';
  const receiptId = typeof params.receiptId === 'string' ? params.receiptId : undefined;
  const locale = i18n.language.startsWith('en') ? 'en-US' : 'uk-UA';
  const {
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
    isExtractPending,
    isUploadDraftPending,
    isUpdateDraftPending,
    isSaveOcrDraftPending,
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
  } = useReceiptDetailController({
    orgId,
    receiptId,
    onReceiptRouteSync: (nextReceiptId, replace) => {
      navigate({
        to: '/dashboard/$orgId/receipts/$receiptId',
        params: { orgId, receiptId: nextReceiptId },
        replace,
      });
    },
  });

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="dashboard-receipts-page">
      <ReceiptDetailHeader
        orgId={orgId}
        receiptId={receiptId}
        title={receiptId ? t('receipts.detail.pageTitleEdit') : t('receipts.detail.pageTitleNew')}
        subtitle={receiptId
          ? t('receipts.detail.pageSubtitleEdit')
          : t('receipts.detail.pageSubtitleNew')}
        backToRegistryLabel={t('receipts.detail.backToRegistry')}
        createAnotherLabel={t('receipts.detail.createAnother')}
        onBackToList={() => navigate({ to: '/dashboard/$orgId/receipts', params: { orgId } })}
        onCreateAnother={() => navigate({ to: '/dashboard/$orgId/receipts/new', params: { orgId } })}
      />

      {!orgId ? (
        <Alert variant="destructive" data-testid="dashboard-receipts-no-org-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('receipts.detail.routeInvalidTitle')}</AlertTitle>
          <AlertDescription>{t('receipts.detail.routeInvalidDescription')}</AlertDescription>
        </Alert>
      ) : null}

      <ReceiptUploadCard
        selectedFile={selectedFile}
        displayedReceiptPreview={displayedReceiptPreview}
        displayedReceiptFileName={displayedReceiptFileName}
        selectedFileWasCropped={selectedFileWasCropped}
        isActionBusy={isActionBusy}
        isUpdateDraftMode={isUpdateDraftMode}
        isUploadingDraft={isUploadDraftPending || isUpdateDraftPending}
        onReceiptFileSelected={onReceiptFileSelected}
        onUploadDraft={onUploadDraft}
        onRecropReceipt={onRecropReceipt}
      />

      <ReceiptItemPhotosCard
        itemPhotos={itemPhotos}
        receiptItems={receipt?.items ?? []}
        onItemPhotosSelected={onItemPhotosSelected}
        onMoveItemPhoto={(index, direction) => {
          void onMoveItemPhoto(index, direction);
        }}
        onRecropItemPhoto={(itemId) => {
          void onRecropItemPhotoById(itemId);
        }}
        onRemoveItemPhoto={(itemId) => {
          void onRemoveItemPhoto(itemId);
        }}
        onLinkPhotoToItem={(photoId, receiptItemId) => {
          void onLinkPhotoToItem(photoId, receiptItemId);
        }}
      />

      <ReceiptPipelineActionsCard
        receiptIdInput={receiptIdInput}
        selectedTaxXmlFileName={selectedTaxXmlFileName}
        selectedModelIdentifier={selectedModelIdentifier}
        ocrModels={ocrModels ?? []}
        canExtract={canExtract}
        isActionBusy={isActionBusy}
        isExtractTemporarilyLocked={isExtractTemporarilyLocked}
        canRetry={canRetry}
        isPendingOcr={isPendingOcr}
        hasVerificationUrl={Boolean(receipt?.verificationUrl)}
        canVerify={Boolean(orgId && activeReceiptId)}
        canActivate={Boolean(activeReceiptId)}
        canRefresh={Boolean(activeReceiptId)}
        retryTitle={!canRetry && activeReceiptId ? t('receipts.detail.pipeline.retryDisabledHint') : undefined}
        onReceiptIdChange={setReceiptIdInput}
        onTaxXmlSelected={onTaxXmlSelected}
        onTaxXmlDrop={(event) => {
          void onTaxXmlDrop(event);
        }}
        onModelIdentifierChange={setSelectedModelIdentifier}
        onExtract={() => {
          void onExtract();
        }}
        onVerify={onVerify}
        onOpenVerificationLink={onOpenVerificationLink}
        onActivate={onActivate}
        onRetry={onRetry}
        onRefresh={onRefresh}
      />

      <ReceiptOcrEditorCard
        hasReceipt={Boolean(receipt)}
        missingOcrFields={missingOcrFields}
        aliasInput={aliasInput}
        ocrDraft={ocrDraft}
        hasOcrChanges={hasOcrChanges}
        itemDraft={itemDraft}
        activeReceiptId={activeReceiptId}
        isActionBusy={isActionBusy}
        isSavePending={isSaveOcrDraftPending}
        structuredOutputJson={getReceiptItemsPayload(receipt)}
        items={receipt?.items ?? []}
        onAliasChange={(value) => {
          setAliasInput(value);
          setHasOcrChanges(true);
        }}
        onChangeOcrField={onChangeOcrField}
        onSaveOcrDraft={onSaveOcrDraft}
        onResetOcrDraft={onResetOcrDraft}
        onItemDraftChange={(field, value) => {
          setItemDraft((prev) => ({ ...prev, [field]: value }));
        }}
        onAddReceiptItem={() => {
          void onAddReceiptItem();
        }}
        onUpdateReceiptItem={onUpdateReceiptItem}
        onDeleteReceiptItem={onDeleteReceiptItem}
      />

      <ReceiptStateCard
        receipt={receipt}
        locale={locale}
        orgId={orgId}
        isPendingOcr={isPendingOcr}
        hasOcrChanges={hasOcrChanges}
        statusLabelKeyMap={statusLabelKeyMap}
        publicationLabelKeyMap={publicationLabelKeyMap}
        onOpenCampaign={(campaignId) => navigate({ to: '/dashboard/$orgId/campaigns/$campaignId', params: { orgId, campaignId } })}
      />

      <ReceiptReextractDialog
        open={isReextractDialogOpen}
        isPending={isExtractPending}
        onOpenChange={setIsReextractDialogOpen}
        onConfirm={onConfirmReextract}
      />

      {cropSession ? (
        <ImageCropDialog
          open={!!cropSession}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeCropSession(cropSession.fallbackToOriginal);
          }}
          imageSrc={cropSession.src}
          onCropComplete={onCropComplete}
          title={cropSession.kind === 'receipt' ? t('receipts.detail.crop.receiptTitle') : t('receipts.detail.crop.itemTitle')}
          description={cropSession.kind === 'receipt'
            ? t('receipts.detail.crop.receiptDescription')
            : t('receipts.detail.crop.itemDescription')}
        />
      ) : null}
    </div>
  );
}
